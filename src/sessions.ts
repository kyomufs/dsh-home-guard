/**
 * Session listing, archive/unarchive through the core workspace registry,
 * and guarded delete (trash-first). Archive is a registry state-list — this
 * module never moves session directories for archive/unarchive. Delete is
 * plugin-side because core exposes no session-delete API.
 *
 * @module dsh-home-guard/sessions
 */

import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { sessionIdOf, sessionUuidOf } from './config.ts'
import { isProtected } from './paths.ts'

const execFileAsync = promisify(execFile)

/** One session row for the viewer. */
export interface SessionRow {
  /** Registry-form id (`session-<uuid>`). */
  id: string
  /** Bare uuid (directory name). */
  uuid: string
  /** Project slug (home-relative directory under sessions/). */
  projectSlug: string
  /** Title from the projection cache, when resolvable. */
  title: string | null
  /** Creation time from the zstd header, when resolvable. */
  createdAtMs: number | null
  /** Directory mtime (ms epoch). */
  mtimeMs: number | null
  /** Directory size in bytes (best effort). */
  sizeBytes: number | null
  /** Whether the registry marks this session archived. */
  archived: boolean
  /** Whether a session.lock file exists. */
  locked: boolean
  /** True when this is the session currently open in the GUI (best effort). */
  isCurrent: boolean
}

/** Workspace registry face (structural: rc.2 facade). */
export interface WorkspaceRegistryFace {
  archiveSession(id: string): Promise<void> | void
  unarchiveSession(id: string): Promise<void> | void
  readonly archivedSessionIds: readonly string[]
}

/**
 * Read archived session ids from `storages/workspace.json` (read-only).
 * Returns null when the file is missing or unparsable.
 *
 * @param workspaceState - absolute path of workspace.json.
 */
export async function readArchivedIds(workspaceState: string): Promise<Set<string> | null> {
  try {
    const text = await fsp.readFile(workspaceState, 'utf8')
    const parsed = JSON.parse(text) as { archivedSessionIds?: unknown }
    const raw = parsed.archivedSessionIds
    if (!Array.isArray(raw)) return new Set()
    return new Set(raw.filter((x): x is string => typeof x === 'string'))
  } catch {
    return null
  }
}

/**
 * Read session titles from `storages/session_projcache.json` (read-only).
 * Returns an empty map when the file is missing or unparsable.
 *
 * @param projCache - absolute path of the projection cache.
 */
export async function readSessionTitles(projCache: string): Promise<Map<string, string>> {
  const titles = new Map<string, string>()
  let parsed: unknown
  try {
    parsed = JSON.parse(await fsp.readFile(projCache, 'utf8'))
  } catch {
    return titles
  }
  // Layout: { tables: { sessions: { <uuid>: { rows: { sessionStats: [...] } } } } }
  // Titles were observed as `"title"` keys; accept the first string we find.
  const walk = (node: unknown, depth: number): void => {
    if (depth > 6 || node === null || typeof node !== 'object') return
    if (Array.isArray(node)) {
      for (const item of node) walk(item, depth + 1)
      return
    }
    const record = node as Record<string, unknown>
    for (const [key, value] of Object.entries(record)) {
      if (key === 'title' && typeof value === 'string' && value.trim() !== '') {
        // Attribute to the nearest enclosing uuid-looking key, if any.
        continue
      }
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key) && !titles.has(key)) {
        const found = extractTitle(value)
        if (found !== null) titles.set(key, found)
      }
      walk(value, depth + 1)
    }
  }
  const root = (parsed as { tables?: { sessions?: unknown } } | null)?.tables?.sessions
  if (root !== undefined && root !== null && typeof root === 'object' && !Array.isArray(root)) {
    for (const [uuid, value] of Object.entries(root as Record<string, unknown>)) {
      if (!titles.has(uuid)) {
        const found = extractTitle(value)
        if (found !== null) titles.set(uuid, found)
      }
    }
    walk(root, 0)
  } else {
    walk(parsed, 0)
  }
  return titles
}

/**
 * Best-effort title extraction from a projection-cache session node.
 *
 * @param node - session node from the projection cache.
 */
function extractTitle(node: unknown): string | null {
  if (node === null || typeof node !== 'object') return null
  const record = node as Record<string, unknown>
  const direct = record.title
  if (typeof direct === 'string' && direct.trim() !== '') return direct.trim().slice(0, 200)
  const rows = record.rows
  if (rows && typeof rows === 'object') {
    const stats = (rows as Record<string, unknown>).sessionStats
    if (Array.isArray(stats)) {
      for (const item of stats) {
        if (item && typeof item === 'object') {
          const t = (item as Record<string, unknown>).title
          if (typeof t === 'string' && t.trim() !== '') return t.trim().slice(0, 200)
        }
      }
    }
  }
  return null
}

/**
 * Parse `createdAt` from the first JSONL line of a zstd session log.
 * Returns null when zstd is unavailable or the header is unparseable.
 *
 * @param logFile - absolute path of `session.v4.jsonl.zstd`.
 */
export async function readSessionCreatedAt(logFile: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('zstd', ['-dc', logFile], {
      timeout: 5_000,
      maxBuffer: 64 * 1024,
      encoding: 'utf8',
      // Only the first line matters; still cap total output.
    })
    const firstLine = stdout.split('\n', 1)[0] ?? ''
    const parsed = JSON.parse(firstLine) as { createdAt?: unknown }
    if (typeof parsed.createdAt === 'number' && Number.isFinite(parsed.createdAt)) return Math.trunc(parsed.createdAt)
    return null
  } catch {
    return null
  }
}

/** Directory size via `du -sb`; null on failure. */
async function dirSize(abs: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('du', ['-sb', abs], { timeout: 10_000, maxBuffer: 64 * 1024 })
    const bytes = Number.parseInt(String(stdout).trim().split(/\s+/)[0] ?? '', 10)
    return Number.isFinite(bytes) ? bytes : null
  } catch {
    return null
  }
}

/** Options for {@link listSessions}. */
export interface ListSessionsOptions {
  /** Include archived sessions in the result. */
  includeArchived: boolean
  /** Registry-form id of the session currently open in the GUI. */
  currentSessionId?: string | null
  /** Cap on rows returned (newest first after sorting by mtime). */
  limit?: number
}

/**
 * List sessions under `<home>/sessions/<slug>/<uuid>/`.
 *
 * @param homePaths - resolved plugin paths.
 * @param options - listing options.
 */
export async function listSessions(
  homePaths: { sessions: string; workspaceState: string; projCache: string },
  options: ListSessionsOptions,
): Promise<SessionRow[]> {
  const archived = await readArchivedIds(homePaths.workspaceState)
  const archivedSet = archived ?? new Set<string>()
  const titles = await readSessionTitles(homePaths.projCache)
  const currentUuid = options.currentSessionId ? sessionUuidOf(options.currentSessionId) : null
  const rows: SessionRow[] = []
  let slugs: string[] = []
  try {
    slugs = await fsp.readdir(homePaths.sessions)
  } catch {
    return []
  }
  for (const slug of slugs) {
    const slugDir = join(homePaths.sessions, slug)
    let st: Awaited<ReturnType<typeof fsp.stat>> | null = null
    try {
      st = await fsp.stat(slugDir)
    } catch {
      continue
    }
    if (!st.isDirectory()) continue
    let uuids: string[] = []
    try {
      uuids = await fsp.readdir(slugDir)
    } catch {
      continue
    }
    for (const uuid of uuids) {
      const dir = join(slugDir, uuid)
      let dst: Awaited<ReturnType<typeof fsp.stat>> | null = null
      try {
        dst = await fsp.stat(dir)
      } catch {
        continue
      }
      if (!dst.isDirectory()) continue
      let locked = false
      try {
        await fsp.access(join(dir, 'session.lock'))
        locked = true
      } catch {
        locked = false
      }
      const id = sessionIdOf(uuid)
      const logFile = join(dir, 'session.v4.jsonl.zstd')
      const createdAtMs = await readSessionCreatedAt(logFile)
      rows.push({
        id,
        uuid,
        projectSlug: slug,
        title: titles.get(uuid) ?? null,
        createdAtMs,
        mtimeMs: Math.trunc(dst.mtimeMs),
        sizeBytes: await dirSize(dir),
        archived: archivedSet.has(id) || archivedSet.has(uuid),
        locked,
        isCurrent: currentUuid !== null && currentUuid === uuid,
      })
    }
  }
  rows.sort((a, b) => (b.mtimeMs ?? 0) - (a.mtimeMs ?? 0))
  return options.limit && options.limit > 0 ? rows.slice(0, options.limit) : rows
}

/** Delete guard outcome. */
export type DeleteGuard = { ok: true } | { ok: false; reason: string }

/**
 * Check every guard before a session delete. Refuses: invalid id, path
 * outside `sessions/`, protected paths, current session, recent lock.
 *
 * @param id - registry-form session id.
 * @param currentSessionId - GUI current session id.
 * @param locked - whether session.lock exists.
 * @param lockMtimeMs - mtime of session.lock (null when absent).
 * @param now - current epoch ms.
 */
export function checkDeleteGuards(
  id: string,
  currentSessionId: string | null | undefined,
  locked: boolean,
  lockMtimeMs: number | null,
  now: number,
): DeleteGuard {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionUuidOf(id))) {
    return { ok: false, reason: 'invalid session id' }
  }
  if (currentSessionId != null && sessionUuidOf(currentSessionId) === sessionUuidOf(id)) {
    return { ok: false, reason: 'refusing to delete the current session' }
  }
  if (locked) {
    const LOCK_GRACE_MS = 5 * 60_000
    if (lockMtimeMs !== null && now - lockMtimeMs < LOCK_GRACE_MS) {
      return { ok: false, reason: 'session.lock is recent; session may be live' }
    }
  }
  return { ok: true }
}

/**
 * Resolve the on-disk directory for a session id by scanning `sessions/`.
 * Returns null when no uuid directory matches.
 *
 * @param sessionsRoot - absolute sessions directory.
 * @param id - registry-form or bare session id.
 */
export async function findSessionDir(sessionsRoot: string, id: string): Promise<{ dir: string; slug: string } | null> {
  const uuid = sessionUuidOf(id)
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid)) return null
  let slugs: string[] = []
  try {
    slugs = await fsp.readdir(sessionsRoot)
  } catch {
    return null
  }
  for (const slug of slugs) {
    const dir = join(sessionsRoot, slug, uuid)
    try {
      const st = await fsp.stat(dir)
      if (st.isDirectory()) return { dir, slug }
    } catch {
      // continue
    }
  }
  return null
}

/** Delete result. */
export interface DeleteSessionResult {
  ok: boolean
  /** Absolute path the session dir was moved to (trash), when moved. */
  targetPath?: string | null
  /** Refusal/error reason. */
  reason?: string
}

/**
 * Delete a session directory: trash-first (rename into the plugin trash),
 * or hard delete when `hardDelete` is set. Refuses protected paths and any
 * directory outside `sessions/`.
 *
 * @param sessionsRoot - absolute sessions directory.
 * @param trashRoot - absolute plugin trash directory.
 * @param id - session id.
 * @param options - delete options.
 */
export async function deleteSessionDir(
  sessionsRoot: string,
  trashRoot: string,
  id: string,
  options: { hardDelete?: boolean; currentSessionId?: string | null; locked?: boolean; lockMtimeMs?: number | null } = {},
): Promise<DeleteSessionResult> {
  const found = await findSessionDir(sessionsRoot, id)
  if (found === null) return { ok: false, reason: 'session directory not found' }
  if (isProtected(`sessions/${found.slug}`)) {
    return { ok: false, reason: 'path is protected by the denylist' }
  }
  const guard = checkDeleteGuards(id, options.currentSessionId ?? null, options.locked ?? false, options.lockMtimeMs ?? null, Date.now())
  if (!guard.ok) return { ok: false, reason: guard.reason }
  const stamp = Date.now()
  const target = join(trashRoot, 'sessions', `${stamp}-${sessionUuidOf(id)}`)
  try {
    if (options.hardDelete === true) {
      await fsp.rm(found.dir, { recursive: true, force: true })
      return { ok: true, targetPath: null }
    }
    await fsp.mkdir(join(trashRoot, 'sessions'), { recursive: true })
    await fsp.rename(found.dir, target)
    return { ok: true, targetPath: target }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/** Archive/unarchive outcome. */
export interface RegistryOpResult {
  ok: boolean
  reason?: string
}

/**
 * Archive a session through the core workspace registry. Idempotent append;
 * the registry is the single source of truth.
 *
 * @param registry - workspace registry face (may be undefined → unavailable).
 * @param id - registry-form session id.
 */
export async function archiveSessionVia(registry: WorkspaceRegistryFace | undefined, id: string): Promise<RegistryOpResult> {
  if (registry === undefined) return { ok: false, reason: 'registry unavailable' }
  if (typeof registry.archiveSession !== 'function') return { ok: false, reason: 'registry unavailable' }
  try {
    await registry.archiveSession(id)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Unarchive a session through the core workspace registry (filter-out).
 *
 * @param registry - workspace registry face (may be undefined → unavailable).
 * @param id - registry-form session id.
 */
export async function unarchiveSessionVia(registry: WorkspaceRegistryFace | undefined, id: string): Promise<RegistryOpResult> {
  if (registry === undefined) return { ok: false, reason: 'registry unavailable' }
  if (typeof registry.unarchiveSession !== 'function') return { ok: false, reason: 'registry unavailable' }
  try {
    await registry.unarchiveSession(id)
    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Collect archived session ids eligible for purge: archived in the registry,
 * directory exists, and mtime older than `olderThanDays`.
 *
 * @param homePaths - plugin paths.
 * @param olderThanDays - age threshold.
 * @param limit - max rows to return.
 */
export async function collectPurgeCandidates(
  homePaths: { sessions: string; workspaceState: string; projCache: string },
  olderThanDays: number,
  limit: number,
): Promise<SessionRow[]> {
  const rows = await listSessions(homePaths, { includeArchived: true })
  const cutoff = Date.now() - olderThanDays * 86_400_000
  return rows.filter((r) => r.archived && (r.mtimeMs ?? 0) < cutoff).slice(0, Math.max(0, limit))
}
