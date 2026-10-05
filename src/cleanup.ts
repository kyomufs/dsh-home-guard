/**
 * Cleanup engine: glob matching over the home tree, trash-first rule
 * execution, schedule math, and trash retention pruning. Every deletion is
 * denylist-checked twice (config validation + runtime) and audited.
 *
 * @module dsh-home-guard/cleanup
 */

import { promises as fsp } from 'node:fs'
import { join, relative } from 'node:path'
import type { CleanupRule } from './config.ts'
import { matchAnyGlob } from './glob.ts'
import { isInside, isProtected, normalizeRel, safeJoin } from './paths.ts'

/** One matched file/directory under the home root. */
export interface MatchEntry {
  /** Home-relative path (forward slashes). */
  relPath: string
  /** Absolute path. */
  absPath: string
  /** Whether the entry is a directory. */
  isDir: boolean
  /** Size in bytes (files: size; dirs: null until measured). */
  sizeBytes: number | null
  /** mtime in ms epoch. */
  mtimeMs: number
}

/** Options for {@link collectMatches}. */
export interface CollectOptions {
  /** Only match entries whose mtime is older than this many days. */
  olderThanDays: number | null
  /** Current epoch ms (test seam). */
  now: number
  /** Max matched entries returned. */
  limit: number
  /** Max directory recursion depth. */
  maxDepth: number
}

/**
 * Recursively collect files/dirs under the home root matching any pattern.
 * Skips protected paths and never leaves the home root. Directories are
 * reported when they match; recursion into them stops at maxDepth.
 *
 * @param homeRoot - absolute home directory.
 * @param patterns - glob patterns relative to the home root.
 * @param options - collection options.
 */
export async function collectMatches(
  homeRoot: string,
  patterns: readonly string[],
  options: CollectOptions,
): Promise<MatchEntry[]> {
  const matches: MatchEntry[] = []
  const cutoff = options.olderThanDays === null ? null : options.now - options.olderThanDays * 86_400_000
  const root = homeRoot
  const walk = async (relDir: string, depth: number): Promise<void> => {
    if (matches.length >= options.limit) return
    if (depth > options.maxDepth) return
    const absDir = relDir === '' ? root : join(root, relDir)
    let names: string[]
    try {
      names = await fsp.readdir(absDir)
    } catch {
      return
    }
    for (const name of names) {
      if (matches.length >= options.limit) return
      const rel = relDir === '' ? name : `${relDir}/${name}`
      const abs = join(root, rel)
      let st: Awaited<ReturnType<typeof fsp.stat>> | null = null
      try {
        st = await fsp.lstat(abs)
      } catch {
        continue
      }
      // Symlinks are never followed (orphan/escape rule).
      const isDir = st.isDirectory()
      const mtimeMs = Math.trunc(st.mtimeMs)
      const ageOk = cutoff === null || mtimeMs < cutoff
      const matchesPattern = matchAnyGlob(rel, patterns)
      if (isProtected(rel)) {
        // Never match or recurse into protected paths.
        continue
      }
      if (matchesPattern && ageOk) {
        matches.push({
          relPath: rel,
          absPath: abs,
          isDir,
          sizeBytes: st.isFile() ? st.size : null,
          mtimeMs,
        })
      }
      if (isDir && !st.isSymbolicLink()) {
        await walk(rel, depth + 1)
      }
    }
  }
  await walk('', 0)
  return matches
}

/** Directory size via `du -sb`; null on failure. */
async function dirSize(abs: string): Promise<number | null> {
  try {
    const { execFile } = await import('node:child_process')
    const { promisify } = await import('node:util')
    const execFileAsync = promisify(execFile)
    const { stdout } = await execFileAsync('du', ['-sb', abs], { timeout: 10_000, maxBuffer: 64 * 1024 })
    const bytes = Number.parseInt(String(stdout).trim().split(/\s+/)[0] ?? '', 10)
    return Number.isFinite(bytes) ? bytes : null
  } catch {
    return null
  }
}

/** Result of one rule execution. */
export interface RuleRunResult {
  ok: boolean
  ruleId: string
  /** Matched entries. */
  matched: number
  /** Entries actually deleted/moved. */
  deleted: number
  /** Bytes affected (best effort). */
  bytes: number
  /** Refused entries (denylist double-check tripped). */
  refused: number
  /** Refusal/error details. */
  details: string[]
}

/**
 * Execute one cleanup rule: collect matches, double-check protection,
 * move to trash (or hard-delete), and report. Dry-run collects and reports
 * without touching disk.
 *
 * @param homeRoot - absolute home directory.
 * @param trashRoot - absolute plugin trash directory.
 * @param rule - the rule to execute.
 * @param options - execution options.
 */
export async function runRule(
  homeRoot: string,
  trashRoot: string,
  rule: CleanupRule,
  options: { dryRun?: boolean; now?: number; limit?: number } = {},
): Promise<RuleRunResult> {
  const now = options.now ?? Date.now()
  const limit = options.limit ?? 500
  const matches = await collectMatches(homeRoot, rule.paths, {
    olderThanDays: rule.olderThanDays,
    now,
    limit,
    maxDepth: 8,
  })
  const result: RuleRunResult = { ok: true, ruleId: rule.id, matched: matches.length, deleted: 0, bytes: 0, refused: 0, details: [] }
  if (options.dryRun === true) {
    return result
  }
  const ruleTrash = join(trashRoot, 'rules', rule.id)
  const stamp = now
  for (const m of matches) {
    // Denylist double-check at runtime (config validation already ran).
    if (isProtected(m.relPath)) {
      result.refused += 1
      result.details.push(`refused protected path: ${m.relPath}`)
      continue
    }
    // Containment re-check: the path must stay inside homeRoot.
    if (!isInside(homeRoot, m.absPath)) {
      result.refused += 1
      result.details.push(`refused path outside home: ${m.relPath}`)
      continue
    }
    if (m.isDir && m.sizeBytes === null) {
      m.sizeBytes = await dirSize(m.absPath)
    }
    const size = m.sizeBytes ?? 0
    try {
      if (rule.hardDelete === true) {
        await fsp.rm(m.absPath, { recursive: true, force: true })
      } else {
        const target = join(ruleTrash, `${stamp}-${normalizeRel(m.relPath).replace(/\//g, '__')}`)
        await fsp.mkdir(ruleTrash, { recursive: true })
        await fsp.rename(m.absPath, target)
      }
      result.deleted += 1
      result.bytes += size
    } catch (error) {
      result.ok = false
      result.details.push(`failed ${m.relPath}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return result
}

/**
 * Is a rule due at `nowMs`? Daily rules fire once per local calendar day at
 * HH:MM; interval rules fire when `now - lastRun >= hours`. Enabled=false
 * rules are never due.
 *
 * @param rule - the rule.
 * @param lastRunMs - last run epoch ms (0 = never).
 * @param nowMs - current epoch ms.
 */
export function isRuleDue(rule: CleanupRule, lastRunMs: number, nowMs: number): boolean {
  if (!rule.enabled) return false
  if (rule.schedule.kind === 'interval') {
    if (lastRunMs === 0) return true
    return nowMs - lastRunMs >= rule.schedule.hours * 3_600_000
  }
  // daily at HH:MM local time
  const [hhStr, mmStr] = rule.schedule.at.split(':')
  const hh = Number(hhStr)
  const mm = Number(mmStr)
  const d = new Date(nowMs)
  const todayAt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hh, mm, 0, 0).getTime()
  if (nowMs < todayAt) return false
  return lastRunMs < todayAt
}

/**
 * Prune plugin trash entries older than `retentionDays`. Directories are
 * removed recursively; the trash root itself is kept.
 *
 * @param trashRoot - absolute plugin trash directory.
 * @param retentionDays - age threshold (0 disables pruning).
 * @param now - current epoch ms.
 */
export async function pruneTrash(trashRoot: string, retentionDays: number, now: number): Promise<{ pruned: number; bytes: number }> {
  if (retentionDays <= 0) return { pruned: 0, bytes: 0 }
  const cutoff = now - retentionDays * 86_400_000
  let pruned = 0
  let bytes = 0
  let tops: string[]
  try {
    tops = await fsp.readdir(trashRoot)
  } catch {
    return { pruned, bytes }
  }
  for (const top of tops) {
    const absTop = join(trashRoot, top)
    let children: string[]
    try {
      const st = await fsp.lstat(absTop)
      if (!st.isDirectory() || st.isSymbolicLink()) continue
      children = await fsp.readdir(absTop)
    } catch {
      continue
    }
    for (const child of children) {
      const abs = join(absTop, child)
      try {
        const st = await fsp.lstat(abs)
        if (st.isSymbolicLink()) continue
        if (Math.trunc(st.mtimeMs) >= cutoff) continue
        bytes += st.isDirectory() ? (await dirSize(abs)) ?? 0 : st.size
        await fsp.rm(abs, { recursive: true, force: true })
        pruned += 1
      } catch {
        // best effort
      }
    }
  }
  return { pruned, bytes }
}

/**
 * Reject rules that would touch denylisted paths. Called at config validation
 * and at setRules time (double gate). Returns refusal reasons per pattern.
 *
 * @param patterns - glob patterns from a rule.
 */
export function checkRulePatterns(patterns: readonly string[]): string[] {
  const problems: string[] = []
  for (const pattern of patterns) {
    const rel = normalizeRel(pattern)
    if (rel === '' || rel === '.') {
      problems.push(`${pattern}: bare "." would match the whole home`)
      continue
    }
    const top = rel.split('/')[0] ?? ''
    if (top === '..') {
      problems.push(`${pattern}: escapes the home root`)
      continue
    }
    // Patterns whose *literal prefix* is protected are refused outright;
    // globs may still match protected children at runtime (second gate).
    const safe = safeJoin('/home', rel)
    if (safe === null) {
      problems.push(`${pattern}: unsafe path`)
      continue
    }
  }
  return problems
}

/**
 * Compute the relative home path of an absolute path (forward slashes).
 *
 * @param homeRoot - absolute home root.
 * @param abs - absolute candidate path.
 */
export function relOf(homeRoot: string, abs: string): string {
  return normalizeRel(relative(homeRoot, abs))
}
