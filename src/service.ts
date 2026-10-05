/**
 * Host service: mounts the `homeGuard` Typert Remote contribution and wires
 * structure scanning, session management, cleanup rules, archived purge,
 * and trash retention to remote methods + the tick timer.
 *
 * @module dsh-home-guard/service
 */

import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import type { Context } from '@deepseek-ai/cordis'
import type { ResolvedConfig } from './config.ts'
import { isValidSessionId, resolveRules, sessionUuidOf } from './config.ts'
import type { HomePaths } from './paths.ts'
import { homePaths, resolveHomeDir } from './paths.ts'
import { scanStructure, summarizeStructure } from './structure.ts'
import type { StructureEntry } from './structure.ts'
import {
  archiveSessionVia,
  checkDeleteGuards,
  collectPurgeCandidates,
  deleteSessionDir,
  findSessionDir,
  listSessions,
  unarchiveSessionVia,
} from './sessions.ts'
import type { SessionRow, WorkspaceRegistryFace } from './sessions.ts'
import type { CleanupRule } from './config.ts'
import { checkRulePatterns, isRuleDue, pruneTrash, runRule } from './cleanup.ts'
import type { RuleRunResult } from './cleanup.ts'
import { appendAudit, readAuditTail } from './audit.ts'
import type { AuditRecord } from './audit.ts'
import type {
  AuditRecordWire,
  CleanupRuleWire,
  OpResultWire,
  SetRulesResultWire,
  SessionListWire,
  HomeGuardStatusWire,
} from './wire.ts'

/** Persisted timer state (`storages/dsh-home-guard/state.json`). */
interface TickState {
  lastPurgeRunMs: number
  lastPurgeResult: string | null
  lastTrashPruneMs: number
  ruleLastRunMs: Record<string, number>
  lastTickError: string | null
}

const EMPTY_TICK_STATE: TickState = {
  lastPurgeRunMs: 0,
  lastPurgeResult: null,
  lastTrashPruneMs: 0,
  ruleLastRunMs: {},
  lastTickError: null,
}

/**
 * Runtime rule store: `storages/dsh-home-guard/rules.json`. Runtime rules
 * override config rules by id; an empty array means "config rules only".
 * setRules replaces the whole runtime list (never touches cordis.patch.yml).
 */
interface RuntimeRulesFile {
  version: 1
  rules: CleanupRuleWire[]
}

/** Plugin name: package name, graph row id, bundle id. */
const NAME = 'dsh-home-guard'

/**
 * HomeGuard service: structure map, sessions, cleanup, purge, audit.
 * Plain class — no `extends TypertRemoteService` (the rc.2 protocol package
 * resolves its own cordis copy under pnpm; a foreign `Service` base breaks
 * host activation). The `typertRemote` binding is hand-written in
 * `src/index.ts` (the dsh-cost-meter pattern).
 * Timer: one unref'd interval driven by config.tickMs; every run is
 * guarded against overlap and never throws out of the interval.
 */
export class HomeGuardService {
  /** Hard dependencies of this service (registry is read softly). */
  static inject: string[] = []

  private readonly ctx: Context
  private readonly cfg: ResolvedConfig
  private readonly paths: HomePaths
  private timer: ReturnType<typeof setInterval> | null = null
  private disposed = false
  private tickState: TickState = { ...EMPTY_TICK_STATE }
  private runtimeRules: CleanupRule[] = []
  private ruleRuns: { ruleId: string; matched: number; deleted: number; bytes: number; dryRun: boolean }[] = []
  private lastTickError: string | null = null
  private registry: WorkspaceRegistryFace | undefined

  /**
   * @param ctx - cordis context.
   * @param config - resolved plugin config.
   */
  constructor(ctx: Context, config: ResolvedConfig) {
    this.ctx = ctx
    this.cfg = config
    this.paths = homePaths(resolveHomeDir(config.homeDir))
    // Soft registry access: archive/unarchive degrade to `registry-unavailable`
    // when the facade is absent; the plugin stays loadable either way.
    this.registry = ctx.get('workspaceRegistry') as WorkspaceRegistryFace | undefined
    void this.bootstrap()
  }

  /**
   * Load persisted tick state + runtime rules; then arm the timer.
   * Failures are recorded, never fatal.
   */
  private async bootstrap(): Promise<void> {
    try {
      await fsp.mkdir(this.paths.unitDir, { recursive: true })
    } catch {
      // recorded on next tick
    }
    await this.loadTickState()
    await this.loadRuntimeRules()
    if (this.disposed) return
    this.timer = setInterval(() => {
      if (this.disposed) return
      void this.runTick(false).catch((error: unknown) => {
        this.lastTickError = error instanceof Error ? error.message : String(error)
      })
    }, this.cfg.tickMs)
    // Never keep the process alive on account of the timer.
    this.timer.unref?.()
    try {
      this.ctx.effect(() => {
        // The effect body returns the disposer cordis runs on fiber unload.
        return () => {
          this.disposed = true
          if (this.timer !== null) {
            clearInterval(this.timer)
            this.timer = null
          }
        }
      }, `${NAME}: timer disposal`)
    } catch {
      // effect unavailable in exotic hosts: timer unref still protects exit
    }
  }

  /**
   * Read `state.json` (tolerant).
   */
  private async loadTickState(): Promise<void> {
    try {
      const raw = JSON.parse(await fsp.readFile(this.paths.stateFile, 'utf8')) as Partial<TickState>
      this.tickState = {
        lastPurgeRunMs: Number(raw.lastPurgeRunMs ?? 0) || 0,
        lastPurgeResult: typeof raw.lastPurgeResult === 'string' ? raw.lastPurgeResult : null,
        lastTrashPruneMs: Number(raw.lastTrashPruneMs ?? 0) || 0,
        ruleLastRunMs: (raw.ruleLastRunMs && typeof raw.ruleLastRunMs === 'object' ? raw.ruleLastRunMs : {}) as Record<string, number>,
        lastTickError: typeof raw.lastTickError === 'string' ? raw.lastTickError : null,
      }
    } catch {
      this.tickState = { ...EMPTY_TICK_STATE }
    }
    this.lastTickError = this.tickState.lastTickError
  }

  /**
   * Persist tick state (tolerant; never throws to callers).
   */
  private async saveTickState(): Promise<void> {
    try {
      await fsp.mkdir(this.paths.unitDir, { recursive: true })
      await fsp.writeFile(this.paths.stateFile, JSON.stringify(this.tickState, null, 2), 'utf8')
    } catch (error) {
      this.lastTickError = error instanceof Error ? error.message : String(error)
    }
  }

  /**
   * Read runtime rules from `rules.json` (tolerant; invalid entries skipped).
   */
  private async loadRuntimeRules(): Promise<void> {
    try {
      const raw = JSON.parse(await fsp.readFile(this.paths.rulesFile, 'utf8')) as Partial<RuntimeRulesFile>
      const list = Array.isArray(raw.rules) ? raw.rules : []
      const { accepted } = resolveRules(list)
      this.runtimeRules = accepted
    } catch {
      this.runtimeRules = []
    }
  }

  /**
   * Persist runtime rules (tolerant).
   */
  private async saveRuntimeRules(): Promise<void> {
    try {
      await fsp.mkdir(this.paths.unitDir, { recursive: true })
      const payload: RuntimeRulesFile = { version: 1, rules: this.runtimeRules as CleanupRuleWire[] }
      await fsp.writeFile(this.paths.rulesFile, JSON.stringify(payload, null, 2), 'utf8')
    } catch (error) {
      this.lastTickError = error instanceof Error ? error.message : String(error)
    }
  }

  /**
   * Effective rules: runtime overrides config by id, runtime-only additions
   * appended in order.
   */
  private effectiveRules(): CleanupRule[] {
    const byId = new Map<string, CleanupRule>()
    for (const rule of this.cfg.cleanupRules) byId.set(rule.id, rule)
    for (const rule of this.runtimeRules) byId.set(rule.id, rule)
    return [...byId.values()]
  }

  /**
   * Wire copy of a rule.
   *
   * @param rule - internal rule.
   */
  private toWire(rule: CleanupRule): CleanupRuleWire {
    return {
      id: rule.id,
      paths: [...rule.paths],
      olderThanDays: rule.olderThanDays,
      schedule: rule.schedule,
      enabled: rule.enabled,
      hardDelete: rule.hardDelete,
    }
  }

  /**
   * Wire copy of a session row.
   *
   * @param row - internal session row.
   */
  private sessionWire(row: SessionRow): HomeGuardStatusWire['sessions'][number] {
    return {
      id: row.id,
      uuid: row.uuid,
      projectSlug: row.projectSlug,
      title: row.title,
      createdAtMs: row.createdAtMs,
      mtimeMs: row.mtimeMs,
      sizeBytes: row.sizeBytes,
      archived: row.archived,
      locked: row.locked,
      isCurrent: row.isCurrent,
    }
  }

  /**
   * Build an OpResult.
   *
   * @param ok - success flag.
   * @param code - machine-readable result code.
   * @param message - human-readable detail.
   */
  private op(ok: boolean, code: string, message: string | null = null, extra: Partial<Pick<OpResultWire, 'matched' | 'deleted' | 'bytes' | 'details'>> = {}): OpResultWire {
    return {
      ok,
      code,
      message,
      matched: extra.matched ?? 0,
      deleted: extra.deleted ?? 0,
      bytes: extra.bytes ?? 0,
      details: extra.details ?? [],
    }
  }

  /**
   * Append an audit record.
   *
   * @param record - the record (ts filled in when absent).
   */
  private async audit(record: Omit<AuditRecord, 'ts'> & { ts?: string }): Promise<void> {
    await appendAudit(this.paths.auditFile, { ts: record.ts ?? new Date().toISOString(), ...record } as AuditRecord)
  }

  /**
   * Full status snapshot: structure map + sessions + cleanup + audit tail.
   * Scans are sequential; sizes are best-effort (`du -sb`).
   */
  async status(): Promise<HomeGuardStatusWire> {
    const structure: StructureEntry[] = await scanStructure(this.paths.root)
    const rows = await listSessions(this.paths, {
      includeArchived: true,
      currentSessionId: null,
    })
    const rules = this.effectiveRules()
    const ruleRuns = this.ruleRuns.slice(-20)
    const auditTail = await readAuditTail(this.paths.auditFile, this.cfg.auditTail)
    return {
      homeDir: this.paths.root,
      generatedAt: Date.now(),
      writeEnabled: this.cfg.writeEnabled,
      confirmRequired: this.cfg.confirmRequired,
      structure,
      structureSummary: summarizeStructure(structure),
      sessions: rows.map((r) => this.sessionWire(r)),
      archivedCount: rows.filter((r) => r.archived).length,
      lockedCount: rows.filter((r) => r.locked).length,
      cleanupRules: rules.map((r) => this.toWire(r)),
      archivedPurge: {
        enabled: this.cfg.archivedPurge.enabled,
        olderThanDays: this.cfg.archivedPurge.olderThanDays,
        intervalMinutes: this.cfg.archivedPurge.intervalMinutes,
        hardDelete: this.cfg.archivedPurge.hardDelete,
        lastRunMs: this.tickState.lastPurgeRunMs,
        lastResult: this.tickState.lastPurgeResult,
      },
      ruleRuns,
      auditTail: auditTail as AuditRecordWire[],
      trashPruned: { pruned: 0, bytes: 0 },
      lastTickError: this.lastTickError,
    }
  }

  /**
   * List sessions; archived included per flag.
   *
   * @param includeArchived - include registry-archived sessions.
   */
  async listSessions(includeArchived: boolean): Promise<SessionListWire> {
    const rows = await listSessions(this.paths, {
      includeArchived,
      currentSessionId: null,
    })
    const visible = includeArchived ? rows : rows.filter((r) => !r.archived)
    return {
      homeDir: this.paths.root,
      sessions: visible.map((r) => this.sessionWire(r)),
      archivedCount: visible.filter((r) => r.archived).length,
      lockedCount: visible.filter((r) => r.locked).length,
    }
  }

  /**
   * Archive a session via the core workspace registry. No disk move.
   *
   * @param id - registry-form session id.
   * @param confirmed - destructive-op confirmation flag.
   */
  async archiveSession(id: string, confirmed: boolean): Promise<OpResultWire> {
    const gate = this.gateWrite(confirmed)
    if (gate !== null) return gate
    if (!isValidSessionId(id)) return this.op(false, 'invalid-session-id', 'session id must be session-<uuid> or <uuid>')
    const found = await findSessionDir(this.paths.sessions, id)
    if (found === null) return this.op(false, 'not-found', 'session directory not found')
    const result = await archiveSessionVia(this.registry, id)
    await this.audit({ kind: 'archive', ruleId: null, path: `sessions/${found.slug}/${sessionUuidOf(id)}`, sessionId: id, matched: 0, deleted: 0, bytes: null, outcome: result.ok ? 'success' : 'error', detail: result.reason ?? undefined })
    return result.ok
      ? this.op(true, 'archived', `archived ${id}`)
      : this.op(false, result.reason === 'registry unavailable' ? 'registry-unavailable' : 'registry-error', result.reason ?? 'registry error')
  }

  /**
   * Unarchive a session via the core workspace registry (idempotent filter).
   *
   * @param id - registry-form session id.
   */
  async unarchiveSession(id: string): Promise<OpResultWire> {
    if (!isValidSessionId(id)) return this.op(false, 'invalid-session-id', 'session id must be session-<uuid> or <uuid>')
    const result = await unarchiveSessionVia(this.registry, id)
    await this.audit({ kind: 'unarchive', ruleId: null, path: null, sessionId: id, matched: 0, deleted: 0, bytes: null, outcome: result.ok ? 'success' : 'error', detail: result.reason ?? undefined })
    return result.ok
      ? this.op(true, 'unarchived', `unarchived ${id}`)
      : this.op(false, result.reason === 'registry unavailable' ? 'registry-unavailable' : 'registry-error', result.reason ?? 'registry error')
  }

  /**
   * Delete a session directory: trash-first (default) or hardDelete opt-in.
   * Guards: uuid shape, directory inside sessions/, not current, lock grace.
   *
   * @param id - session id.
   * @param confirmed - destructive-op confirmation flag.
   * @param currentSessionId - GUI current session id (routed approval).
   * @param hardDelete - skip trash (irreversible).
   */
  async deleteSession(id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean): Promise<OpResultWire> {
    const gate = this.gateWrite(confirmed)
    if (gate !== null) return gate
    if (!isValidSessionId(id)) return this.op(false, 'invalid-session-id', 'session id must be session-<uuid> or <uuid>')
    const found = await findSessionDir(this.paths.sessions, id)
    if (found === null) return this.op(false, 'not-found', 'session directory not found')
    let locked = false
    let lockMtimeMs: number | null = null
    try {
      const st = await fsp.stat(join(found.dir, 'session.lock'))
      locked = true
      lockMtimeMs = Math.trunc(st.mtimeMs)
    } catch {
      locked = false
    }
    const guard = checkDeleteGuards(id, currentSessionId, locked, lockMtimeMs, Date.now())
    if (!guard.ok) {
      await this.audit({ kind: 'delete', ruleId: null, path: `sessions/${found.slug}/${sessionUuidOf(id)}`, sessionId: id, matched: 0, deleted: 0, bytes: null, outcome: 'refused', detail: guard.reason })
      return this.op(false, 'refused', guard.reason)
    }
    const result = await deleteSessionDir(this.paths.sessions, this.paths.trash, id, {
      hardDelete,
      currentSessionId,
      locked,
      lockMtimeMs,
    })
    await this.audit({ kind: 'delete', ruleId: null, path: `sessions/${found.slug}/${sessionUuidOf(id)}`, sessionId: id, matched: 1, deleted: result.ok ? 1 : 0, bytes: null, outcome: result.ok ? 'success' : 'error', detail: result.reason ?? undefined })
    return result.ok
      ? this.op(true, hardDelete ? 'hard-deleted' : 'moved-to-trash', result.targetPath ?? 'deleted', { deleted: 1, matched: 1 })
      : this.op(false, 'delete-failed', result.reason ?? 'delete failed')
  }

  /**
   * Purge archived sessions older than the configured threshold.
   *
   * @param confirmed - destructive-op confirmation flag.
   * @param dryRun - collect and report without deleting.
   */
  async purgeArchived(confirmed: boolean, dryRun: boolean): Promise<OpResultWire> {
    const gate = this.gateWrite(confirmed)
    if (gate !== null) return gate
    const candidates = await collectPurgeCandidates(this.paths, this.cfg.archivedPurge.olderThanDays, this.cfg.purgeLimit)
    const details: string[] = []
    let deleted = 0
    let bytes = 0
    if (!dryRun) {
      for (const row of candidates) {
        const result = await deleteSessionDir(this.paths.sessions, this.paths.trash, row.id, {
          hardDelete: this.cfg.archivedPurge.hardDelete,
          currentSessionId: null,
          locked: row.locked,
          lockMtimeMs: null,
        })
        if (result.ok) {
          deleted += 1
          bytes += row.sizeBytes ?? 0
        } else {
          details.push(`${row.id}: ${result.reason ?? 'failed'}`)
        }
      }
    }
    this.tickState.lastPurgeRunMs = Date.now()
    this.tickState.lastPurgeResult = `matched=${candidates.length} deleted=${deleted}${dryRun ? ' (dry-run)' : ''}`
    await this.saveTickState()
    await this.audit({ kind: 'purge', ruleId: null, path: null, sessionId: null, matched: candidates.length, deleted, bytes: bytes > 0 ? bytes : null, outcome: dryRun ? 'dry-run' : 'success', detail: details.length > 0 ? details.slice(0, 10).join('; ') : undefined })
    return this.op(true, dryRun ? 'purge-dry-run' : 'purge-complete', this.tickState.lastPurgeResult, { matched: candidates.length, deleted, bytes, details })
  }

  /**
   * Run one cleanup rule (or `all`): denylist double-gate, trash-first,
   * audit + state update.
   *
   * @param ruleId - rule id or `all`.
   * @param confirmed - destructive-op confirmation flag.
   * @param dryRun - collect and report without deleting.
   */
  async runCleanup(ruleId: string, confirmed: boolean, dryRun: boolean): Promise<OpResultWire> {
    const gate = this.gateWrite(confirmed)
    if (gate !== null) return gate
    const rules = this.effectiveRules()
    const targets = ruleId === 'all' ? rules.filter((r) => r.enabled) : rules.filter((r) => r.id === ruleId)
    if (targets.length === 0) return this.op(false, 'rule-not-found', `no rule matches id "${ruleId}"`)
    const details: string[] = []
    let matched = 0
    let deleted = 0
    let bytes = 0
    const runSummaries: HomeGuardStatusWire['ruleRuns'] = []
    for (const rule of targets) {
      // Denylist double-check at run time (config validation already ran).
      const problems = checkRulePatterns(rule.paths)
      if (problems.length > 0) {
        details.push(...problems.map((p) => `${rule.id}: ${p}`))
        continue
      }
      const result: RuleRunResult = await runRule(this.paths.root, this.paths.trash, rule, {
        dryRun,
        limit: this.cfg.matchLimit,
      })
      matched += result.matched
      deleted += result.deleted
      bytes += result.bytes
      details.push(...result.details.slice(0, 10))
      runSummaries.push({ ruleId: rule.id, matched: result.matched, deleted: result.deleted, bytes: result.bytes, dryRun })
      if (!dryRun) {
        this.tickState.ruleLastRunMs[rule.id] = Date.now()
        this.ruleRuns.push({ ruleId: rule.id, matched: result.matched, deleted: result.deleted, bytes: result.bytes, dryRun })
        if (this.ruleRuns.length > 50) this.ruleRuns = this.ruleRuns.slice(-50)
      }
      await this.audit({ kind: 'cleanup', ruleId: rule.id, path: null, sessionId: null, matched: result.matched, deleted: result.deleted, bytes: result.bytes > 0 ? result.bytes : null, outcome: dryRun ? 'dry-run' : result.ok ? 'success' : 'error', detail: result.details.slice(0, 5).join('; ') || undefined })
    }
    if (!dryRun) await this.saveTickState()
    return this.op(true, dryRun ? 'cleanup-dry-run' : 'cleanup-complete', `${targets.length} rule(s) processed`, { matched, deleted, bytes, details })
  }

  /**
   * Replace the runtime rule list (persisted to our own unit, never
   * cordis.patch.yml). Runtime rules override config rules by id.
   *
   * @param rulesJson - JSON array of rules (untrusted).
   * @param confirmed - destructive-op confirmation flag.
   */
  async setRules(rulesJson: string, confirmed: boolean): Promise<SetRulesResultWire> {
    const gate = this.gateWrite(confirmed)
    if (gate !== null) {
      return { ok: false, accepted: [], rejected: [{ id: '*', reason: gate.message ?? gate.code }], effective: this.effectiveRules().map((r) => this.toWire(r)) }
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(rulesJson)
    } catch (error) {
      return { ok: false, accepted: [], rejected: [{ id: '*', reason: `invalid JSON: ${error instanceof Error ? error.message : String(error)}` }], effective: this.effectiveRules().map((r) => this.toWire(r)) }
    }
    const { accepted, rejected } = resolveRules(parsed)
    // Denylist double-gate: patterns must not target protected paths outright.
    const extraRejected: { id: string; reason: string }[] = []
    const finalAccepted: CleanupRule[] = []
    for (const rule of accepted) {
      const problems = checkRulePatterns(rule.paths)
      if (problems.length > 0) {
        extraRejected.push({ id: rule.id, reason: problems.join('; ') })
        continue
      }
      finalAccepted.push(rule)
    }
    const allRejected = [...rejected, ...extraRejected]
    if (allRejected.length > 0 && finalAccepted.length === 0) {
      return { ok: false, accepted: [], rejected: allRejected, effective: this.effectiveRules().map((r) => this.toWire(r)) }
    }
    this.runtimeRules = finalAccepted
    await this.saveRuntimeRules()
    await this.audit({ kind: 'rules-set', ruleId: null, path: null, sessionId: null, matched: finalAccepted.length, deleted: 0, bytes: null, outcome: allRejected.length > 0 ? 'error' : 'success', detail: allRejected.map((r) => `${r.id}: ${r.reason}`).join('; ') || undefined })
    return {
      ok: allRejected.length === 0,
      accepted: finalAccepted.map((r) => r.id),
      rejected: allRejected,
      effective: this.effectiveRules().map((r) => this.toWire(r)),
    }
  }

  /**
   * Read the audit tail.
   *
   * @param limit - max records.
   */
  async getAudit(limit: number): Promise<{ records: AuditRecordWire[] }> {
    const records = await readAuditTail(this.paths.auditFile, Math.max(1, Math.min(500, limit || 40)))
    return { records: records as AuditRecordWire[] }
  }

  /**
   * Run one timer tick on demand: archived purge + trash retention prune.
   * Also used internally by the interval timer.
   *
   * @param confirmed - gate (tick uses internal false → skipped unless due).
   */
  async runTick(confirmed: boolean): Promise<OpResultWire> {
    const now = Date.now()
    const details: string[] = []
    let purged = 0
    let pruned = 0
    try {
      if (this.cfg.archivedPurge.enabled) {
        const due = this.tickState.lastPurgeRunMs === 0 ||
          now - this.tickState.lastPurgeRunMs >= this.cfg.archivedPurge.intervalMinutes * 60_000
        if (due) {
          const result = await this.purgeArchived(true, false)
          if (result.ok) purged = result.deleted
          details.push(`purge: ${result.message ?? result.code}`)
        }
      }
      const dueTrash = this.tickState.lastTrashPruneMs === 0 ||
        now - this.tickState.lastTrashPruneMs >= 86_400_000
      if (dueTrash && this.cfg.trashRetentionDays > 0) {
        const prune = await pruneTrash(this.paths.trash, this.cfg.trashRetentionDays, now)
        pruned = prune.pruned
        this.tickState.lastTrashPruneMs = now
        if (prune.pruned > 0) {
          await this.audit({ kind: 'trash-prune', ruleId: null, path: null, sessionId: null, matched: prune.pruned, deleted: prune.pruned, bytes: prune.bytes, outcome: 'success' })
        }
        details.push(`trash-prune: ${prune.pruned} entr(ies)`)
      }
      // Due cleanup rules run on their own schedules.
      const dueRules = this.effectiveRules().filter((rule) =>
        isRuleDue(rule, this.tickState.ruleLastRunMs[rule.id] ?? 0, now),
      )
      for (const rule of dueRules) {
        const result = await this.runCleanup(rule.id, true, false)
        details.push(`rule ${rule.id}: ${result.message ?? result.code}`)
      }
      this.lastTickError = null
      this.tickState.lastTickError = null
      await this.saveTickState()
      return this.op(true, 'tick-complete', `purged=${purged} pruned=${pruned}`, { deleted: purged + pruned, details })
    } catch (error) {
      this.lastTickError = error instanceof Error ? error.message : String(error)
      this.tickState.lastTickError = this.lastTickError
      await this.saveTickState()
      return this.op(false, 'tick-error', this.lastTickError, { details })
    }
  }

  /**
   * Destructive-op gate: writeEnabled switch + confirmation flag.
   *
   * @param confirmed - client confirmation flag.
   */
  private gateWrite(confirmed: boolean): OpResultWire | null {
    if (!this.cfg.writeEnabled) return this.op(false, 'write-disabled', 'plugin writeEnabled=false')
    if (this.cfg.confirmRequired && !confirmed) return this.op(false, 'not-confirmed', 'destructive operation requires confirmation')
    return null
  }
}
