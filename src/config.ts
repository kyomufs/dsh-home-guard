/**
 * Explicit resolve step for the `dsh-home-guard` plugin configuration.
 * `resolveConfig` re-judges every default and bound so programmatic
 * construction that bypasses Schemastery normalization still fails loud
 * instead of running with hidden defaults.
 *
 * @module dsh-home-guard/config
 */

import z from '@deepseek-ai/schemastery'

/** Default tick cadence for the cleanup/purge runner (ms). */
export const DEFAULT_TICK_MS = 60_000

/** Minimum tick cadence (ms). */
export const MIN_TICK_MS = 15_000

/** Default archived-session purge age (days). */
export const DEFAULT_PURGE_OLDER_THAN_DAYS = 30

/** Default purge interval (minutes). */
export const DEFAULT_PURGE_INTERVAL_MINUTES = 60

/** Default retention for the plugin trash (days). */
export const DEFAULT_TRASH_RETENTION_DAYS = 7

/** Maximum number of cleanup matches one rule may process per run. */
export const DEFAULT_MATCH_LIMIT = 500

/** Maximum archived sessions one purge pass may process. */
export const DEFAULT_PURGE_LIMIT = 200

/** Whether destructive RPCs require an explicit `confirmed` flag. */
export const DEFAULT_CONFIRM_REQUIRED = true

/** Audit log tail size returned by `homeGuard/status` (entries). */
export const DEFAULT_AUDIT_TAIL = 40

/** A user-defined cleanup rule (also the wire shape in `src/wire.ts`). */
export interface CleanupRule {
  /** Stable rule id; runtime rules override config rules with the same id. */
  id: string
  /** Glob patterns relative to the DSH home directory. */
  paths: string[]
  /** Only match entries whose mtime is older than this many days (null = any). */
  olderThanDays: number | null
  /** Daily at local HH:MM, or interval every N hours. */
  schedule:
    | { kind: 'daily'; at: string }
    | { kind: 'interval'; hours: number }
  /** Disabled rules never run and never appear as due. */
  enabled: boolean
  /** hardDelete removes matched entries instead of moving them to trash. */
  hardDelete: boolean
}

/** User-defined archived-session purge policy. */
export interface ArchivedPurgeConfig {
  /** Master switch for the timer-based purge. */
  enabled: boolean
  /** Archived sessions older than this many days are purged. */
  olderThanDays: number
  /** Interval between purge checks (minutes). */
  intervalMinutes: number
  /** hardDelete removes session dirs instead of moving them to trash. */
  hardDelete: boolean
}

/** Configuration for the DSH home structure control plugin. */
export interface Config {
  /** DSH home directory; empty string = $DSH_HOME or ~/.dsh. */
  homeDir?: string
  /** Master switch for destructive RPCs (delete/purge/cleanup/setRules). */
  writeEnabled?: boolean
  /** Whether destructive RPCs demand an explicit confirmed flag. */
  confirmRequired?: boolean
  /** Cleanup runner tick cadence in ms. */
  tickMs?: number
  /** Archived-session purge policy. */
  archivedPurge?: ArchivedPurgeConfig
  /** User-defined cleanup rules. */
  cleanupRules?: CleanupRule[]
  /** Days to keep plugin trash before pruning it. */
  trashRetentionDays?: number
  /** Maximum cleanup matches processed per rule per run. */
  matchLimit?: number
  /** Maximum archived sessions processed per purge pass. */
  purgeLimit?: number
  /** Audit entries returned in the status snapshot. */
  auditTail?: number
}

/** Fully resolved configuration captured at plugin load. */
export interface ResolvedConfig {
  homeDir: string
  writeEnabled: boolean
  confirmRequired: boolean
  tickMs: number
  archivedPurge: ArchivedPurgeConfig
  cleanupRules: CleanupRule[]
  trashRetentionDays: number
  matchLimit: number
  purgeLimit: number
  auditTail: number
}

/** Schemastery schema the plugin Loader validates config against. */
export const Config: z<Config> = z.object({
  homeDir: z.string().default(''),
  writeEnabled: z.boolean().default(true),
  confirmRequired: z.boolean().default(DEFAULT_CONFIRM_REQUIRED),
  tickMs: z.number().step(1).min(MIN_TICK_MS).max(3_600_000).default(DEFAULT_TICK_MS),
  archivedPurge: z
    .object({
      enabled: z.boolean().default(false),
      olderThanDays: z.number().step(1).min(1).max(3650).default(DEFAULT_PURGE_OLDER_THAN_DAYS),
      intervalMinutes: z.number().step(1).min(1).max(10_080).default(DEFAULT_PURGE_INTERVAL_MINUTES),
      hardDelete: z.boolean().default(false),
    })
    .default({ enabled: false, olderThanDays: DEFAULT_PURGE_OLDER_THAN_DAYS, intervalMinutes: DEFAULT_PURGE_INTERVAL_MINUTES, hardDelete: false }),
  cleanupRules: z.array(z.any()).default([]),
  trashRetentionDays: z.number().step(1).min(0).max(3650).default(DEFAULT_TRASH_RETENTION_DAYS),
  matchLimit: z.number().step(1).min(1).max(10_000).default(DEFAULT_MATCH_LIMIT),
  purgeLimit: z.number().step(1).min(1).max(5_000).default(DEFAULT_PURGE_LIMIT),
  auditTail: z.number().step(1).min(1).max(500).default(DEFAULT_AUDIT_TAIL),
})

const RULE_ID = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/
const DAILY_AT = /^([01]\d|2[0-3]):[0-5]\d$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Registry form of a session id (`session-<uuid>`). */
export const SESSION_ID_PREFIX = 'session-'

/**
 * Validate one cleanup rule. Returns an error string for invalid rules,
 * `null` when the rule is acceptable.
 *
 * @param rule - candidate rule (untrusted shape).
 */
export function validateRule(rule: unknown): string | null {
  if (typeof rule !== 'object' || rule === null) return 'rule must be an object'
  const r = rule as Record<string, unknown>
  if (typeof r.id !== 'string' || !RULE_ID.test(r.id)) return 'id must match [A-Za-z0-9][A-Za-z0-9._-]{0,63}'
  if (!Array.isArray(r.paths) || r.paths.length === 0) return 'paths must be a non-empty array'
  for (const p of r.paths) {
    if (typeof p !== 'string' || p.trim() === '') return 'every path must be a non-empty string'
    if (p.includes('\\')) return 'paths must use forward slashes'
  }
  const older = r.olderThanDays
  if (older !== null && older !== undefined) {
    if (typeof older !== 'number' || !Number.isInteger(older) || older < 0) return 'olderThanDays must be a non-negative integer or null'
  }
  const schedule = r.schedule as Record<string, unknown> | undefined
  if (typeof schedule !== 'object' || schedule === null) return 'schedule must be an object'
  if (schedule.kind === 'daily') {
    if (typeof schedule.at !== 'string' || !DAILY_AT.test(schedule.at)) return 'daily schedule.at must be HH:MM'
  } else if (schedule.kind === 'interval') {
    if (typeof schedule.hours !== 'number' || !Number.isFinite(schedule.hours) || schedule.hours < 1) return 'interval schedule.hours must be >= 1'
  } else {
    return 'schedule.kind must be "daily" or "interval"'
  }
  return null
}

/**
 * Normalize a validated rule (defaults for enabled/hardDelete/olderThanDays).
 *
 * @param rule - a rule that already passed {@link validateRule}.
 */
export function normalizeRule(rule: Record<string, unknown>): CleanupRule {
  const schedule = rule.schedule as Record<string, unknown>
  return {
    id: String(rule.id),
    paths: (rule.paths as unknown[]).map((p) => String(p).trim()),
    olderThanDays: rule.olderThanDays === undefined || rule.olderThanDays === null
      ? null
      : Number(rule.olderThanDays),
    schedule: schedule.kind === 'daily'
      ? { kind: 'daily', at: String(schedule.at) }
      : { kind: 'interval', hours: Number(schedule.hours) },
    enabled: rule.enabled !== false,
    hardDelete: rule.hardDelete === true,
  }
}

/**
 * Validate + normalize a whole rules array; invalid entries are rejected with
 * per-entry reasons instead of failing the batch.
 *
 * @param raw - candidate rules array (untrusted).
 */
export function resolveRules(raw: unknown): { accepted: CleanupRule[]; rejected: { id: string; reason: string }[] } {
  const accepted: CleanupRule[] = []
  const rejected: { id: string; reason: string }[] = []
  if (!Array.isArray(raw)) {
    return { accepted, rejected: [{ id: '*', reason: 'cleanupRules must be an array' }] }
  }
  for (const entry of raw) {
    const problem = validateRule(entry)
    if (problem !== null) {
      const id = typeof (entry as Record<string, unknown> | null)?.id === 'string'
        ? String((entry as Record<string, unknown>).id)
        : '<unknown>'
      rejected.push({ id, reason: problem })
      continue
    }
    accepted.push(normalizeRule(entry as Record<string, unknown>))
  }
  return { accepted, rejected }
}

/**
 * Validate a session id: registry form `session-<uuid>` or bare `<uuid>`.
 *
 * @param id - candidate session id.
 */
export function isValidSessionId(id: unknown): id is string {
  if (typeof id !== 'string') return false
  const uuid = id.startsWith(SESSION_ID_PREFIX) ? id.slice(SESSION_ID_PREFIX.length) : id
  return UUID_RE.test(uuid)
}

/**
 * Strip the `session-` prefix; bare uuids pass through.
 *
 * @param id - registry or bare session id.
 */
export function sessionUuidOf(id: string): string {
  return id.startsWith(SESSION_ID_PREFIX) ? id.slice(SESSION_ID_PREFIX.length) : id
}

/**
 * Registry form of a session id.
 *
 * @param uuid - bare uuid.
 */
export function sessionIdOf(uuid: string): string {
  return uuid.startsWith(SESSION_ID_PREFIX) ? uuid : `${SESSION_ID_PREFIX}${uuid}`
}

/**
 * Resolve the raw loader config into a fully judged {@link ResolvedConfig}.
 * Every bound is re-checked here so programmatic construction bypassing
 * Schemastery normalization still fails loud.
 *
 * @param raw - raw loader config (already Schemastery-normalized in practice).
 */
export function resolveConfig(raw: Config | undefined): ResolvedConfig {
  const input = raw ?? {}
  const purgeRaw: Partial<ArchivedPurgeConfig> = input.archivedPurge ?? {}
  const tickMs = Number(input.tickMs ?? DEFAULT_TICK_MS)
  if (!Number.isFinite(tickMs) || tickMs < MIN_TICK_MS) {
    throw new Error(`tickMs must be a finite number >= ${MIN_TICK_MS}`)
  }
  const purge: ArchivedPurgeConfig = {
    enabled: purgeRaw.enabled === true,
    olderThanDays: Number(purgeRaw.olderThanDays ?? DEFAULT_PURGE_OLDER_THAN_DAYS),
    intervalMinutes: Number(purgeRaw.intervalMinutes ?? DEFAULT_PURGE_INTERVAL_MINUTES),
    hardDelete: purgeRaw.hardDelete === true,
  }
  if (!Number.isFinite(purge.olderThanDays) || purge.olderThanDays < 1) {
    throw new Error('archivedPurge.olderThanDays must be a number >= 1')
  }
  if (!Number.isFinite(purge.intervalMinutes) || purge.intervalMinutes < 1) {
    throw new Error('archivedPurge.intervalMinutes must be a number >= 1')
  }
  const { accepted, rejected } = resolveRules(input.cleanupRules ?? [])
  if (rejected.length > 0) {
    throw new Error(`cleanupRules rejected: ${rejected.map((r) => `${r.id}: ${r.reason}`).join('; ')}`)
  }
  return {
    homeDir: typeof input.homeDir === 'string' ? input.homeDir.trim() : '',
    writeEnabled: input.writeEnabled !== false,
    confirmRequired: input.confirmRequired !== false,
    tickMs,
    archivedPurge: purge,
    cleanupRules: accepted,
    trashRetentionDays: Number(input.trashRetentionDays ?? DEFAULT_TRASH_RETENTION_DAYS),
    matchLimit: Number(input.matchLimit ?? DEFAULT_MATCH_LIMIT),
    purgeLimit: Number(input.purgeLimit ?? DEFAULT_PURGE_LIMIT),
    auditTail: Number(input.auditTail ?? DEFAULT_AUDIT_TAIL),
  }
}
