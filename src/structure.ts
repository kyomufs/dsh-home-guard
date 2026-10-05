/**
 * The structure map of `~/.dsh`: a static provenance catalog plus a live
 * scanner that classifies every known and unknown top-level entry. Markers:
 * 🟢 required (core/user files), 🔵 plugin-owned, 🟡 prunable, ⚪ unknown.
 *
 * @module dsh-home-guard/structure
 */

import { promises as fsp } from 'node:fs'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { normalizeRel } from './paths.ts'

const execFileAsync = promisify(execFile)

/** Classification of a home entry. */
export type EntryClass = 'required' | 'plugin-owned' | 'prunable' | 'unknown'

/** Where an entry comes from. */
export type EntryOrigin = 'core' | 'user' | 'plugin' | 'system' | 'unknown'

/** One row of the structure map. */
export interface StructureEntry {
  /** Home-relative path (forward slashes). */
  path: string
  /** Whether the entry exists on disk. */
  exists: boolean
  /** Marker class. */
  cls: EntryClass
  /** Provenance. */
  origin: EntryOrigin
  /** Owning component (package/unit name), when known. */
  owner: string | null
  /** Human-readable description (English). */
  description: string
  /** Disk size in bytes (null when unknown/unscanned). */
  sizeBytes: number | null
  /** Last modification time (ms epoch), null when absent. */
  mtimeMs: number | null
  /** Number of child entries (dirs only), null when unknown. */
  childCount: number | null
}

/** Static catalog row (no runtime facts). */
export interface CatalogRow {
  path: string
  cls: EntryClass
  origin: EntryOrigin
  owner: string | null
  description: string
}

/** Catalog of every entry the plugin knows by provenance. */
export const STRUCTURE_CATALOG: readonly CatalogRow[] = Object.freeze([
  { path: 'sessions', cls: 'required', origin: 'core', owner: 'dsh-session-persistence', description: 'Live session storage: one directory per session (session.v4.jsonl.zstd + lock). Owned by session persistence; the plugin never bulk-deletes it.' },
  { path: 'attachments', cls: 'required', origin: 'core', owner: 'dsh-attachment', description: 'Session attachments. Never deleted by cleanup rules.' },
  { path: '.credentials.yaml', cls: 'required', origin: 'user', owner: 'user', description: 'Secrets. Never read, never modified, never deleted.' },
  { path: 'profiles', cls: 'required', origin: 'user', owner: 'user', description: 'DSH profiles (web = active profile): pnpm projects holding plugin installs and cordis.patch.yml overrides.' },
  { path: 'skills', cls: 'required', origin: 'user', owner: 'user', description: 'Agent skills. Never deleted by cleanup rules.' },
  { path: 'AGENTS.md', cls: 'required', origin: 'user', owner: 'user', description: 'Global agent instructions in force for every DSH session.' },
  { path: '.git', cls: 'required', origin: 'user', owner: 'user', description: 'Git repository of the DSH home (config snapshots).' },
  { path: 'dsh-usage', cls: 'required', origin: 'plugin', owner: 'dsh-cost-meter', description: 'Usage ledger and provider snapshots. Never deleted by cleanup rules.' },
  { path: 'state', cls: 'required', origin: 'plugin', owner: 'dsh-opencode-zen', description: 'Per-plugin runtime state (quota snapshots etc.). Never deleted by cleanup rules.' },
  { path: 'cordis.patch.yml', cls: 'required', origin: 'user', owner: 'user', description: 'User-level profile overrides (MCP servers, lsp-actions). Backed up before every plugin write.' },
  { path: 'settings.yaml.imported', cls: 'required', origin: 'user', owner: 'user', description: 'Imported settings snapshot.' },
  { path: 'storages/workspace.json', cls: 'required', origin: 'core', owner: 'dsh-workspace', description: 'Workspace registry state: workspaceIds and archivedSessionIds. Archive/unarchive go through the registry API, never by hand-editing this file.' },
  { path: 'storages/cost-meter', cls: 'plugin-owned', origin: 'plugin', owner: 'dsh-cost-meter', description: 'Cost-meter storage unit (usage history).' },
  { path: 'storages/session_projcache.json', cls: 'plugin-owned', origin: 'plugin', owner: 'dsh-session-projection', description: 'Session projection cache (titles, stats). Read-only for this plugin; prunable by age via cleanup rules.' },
  { path: 'storages/dsh-home-guard', cls: 'plugin-owned', origin: 'plugin', owner: 'dsh-home-guard', description: 'This plugin: runtime rules, audit log, timer state.' },
  { path: 'trash', cls: 'plugin-owned', origin: 'plugin', owner: 'dsh-home-guard', description: 'Plugin trash root. Entries older than trashRetentionDays are pruned automatically.' },
  { path: 'logs', cls: 'prunable', origin: 'core', owner: 'dsh-logging', description: 'Harness logs. Safe to prune by age.' },
  { path: 'cache', cls: 'prunable', origin: 'core', owner: 'dsh-cache', description: 'General caches. Safe to prune by age.' },
  { path: 'session_projcache', cls: 'prunable', origin: 'plugin', owner: 'dsh-session-projection', description: 'Session projection cache directories. Files older than 14 days are safe to prune.' },
  { path: '.playwright-mcp', cls: 'prunable', origin: 'plugin', owner: 'playwright-mcp', description: 'Playwright MCP browser artifacts. Safe to prune by age.' },
  { path: 'node_modules', cls: 'plugin-owned', origin: 'system', owner: 'pnpm', description: 'Profile dependency tree. Managed by pnpm; never hand-edited, never deleted here.' },
])

const CATALOG_BY_PATH = new Map(STRUCTURE_CATALOG.map((row) => [row.path, row]))

/** Scanner options. */
export interface ScanOptions {
  /** Measure directory sizes with `du -sb` (slower, exact disk usage). */
  measureSizes?: boolean
  /** Cap on children counted per directory. */
  childCountCap?: number
}

/**
 * Recursive byte size of a directory via `du -sb`; returns null on failure
 * or non-zero exit (missing binary, permission denied, ...).
 *
 * @param abs - absolute path.
 */
async function duSize(abs: string): Promise<number | null> {
  try {
    const { stdout } = await execFileAsync('du', ['-sb', abs], { timeout: 10_000, maxBuffer: 64 * 1024 })
    const bytes = Number.parseInt(String(stdout).trim().split(/\s+/)[0] ?? '', 10)
    return Number.isFinite(bytes) ? bytes : null
  } catch {
    return null
  }
}

/**
 * Scan the DSH home and build the live structure map. Every catalog entry is
 * reported (with `exists: false` when absent) plus any unknown top-level
 * entries discovered on disk.
 *
 * @param homeRoot - absolute DSH home directory.
 * @param options - scan options.
 */
export async function scanStructure(homeRoot: string, options: ScanOptions = {}): Promise<StructureEntry[]> {
  const measureSizes = options.measureSizes !== false
  const childCountCap = options.childCountCap ?? 500
  const entries: StructureEntry[] = []
  let diskNames: string[] = []
  try {
    diskNames = await fsp.readdir(homeRoot)
  } catch {
    // Home missing/unreadable: still emit the catalog with exists:false.
  }
  const diskSet = new Set(diskNames.map((n) => normalizeRel(n)))
  const pathsToVisit = new Set<string>([
    ...STRUCTURE_CATALOG.map((row) => row.path),
    ...diskSet,
  ])
  for (const rel of [...pathsToVisit].sort()) {
    const abs = join(homeRoot, rel)
    let st: Awaited<ReturnType<typeof fsp.stat>> | null = null
    try {
      st = await fsp.stat(abs)
    } catch {
      st = null
    }
    const exists = st !== null
    const row = CATALOG_BY_PATH.get(rel)
    let childCount: number | null = null
    if (st?.isDirectory()) {
      try {
        const children = await fsp.readdir(abs)
        childCount = Math.min(children.length, childCountCap)
      } catch {
        childCount = null
      }
    }
    entries.push({
      path: rel,
      exists,
      cls: row?.cls ?? 'unknown',
      origin: row?.origin ?? 'unknown',
      owner: row?.owner ?? null,
      description: row?.description
        ?? `Unrecognized entry in the DSH home. Provenance unknown; inspect before allowing any cleanup rule to touch it.`,
      sizeBytes: measureSizes && exists ? await duSize(abs) : null,
      mtimeMs: exists && st ? Math.trunc(st.mtimeMs) : null,
      childCount,
    })
  }
  // Ensure unknown disk entries got rows even if the union missed them.
  const seen = new Set(entries.map((e) => e.path))
  for (const name of diskSet) {
    if (!seen.has(name)) {
      entries.push({
        path: name,
        exists: true,
        cls: 'unknown',
        origin: 'unknown',
        owner: null,
        description: 'Unrecognized entry in the DSH home. Provenance unknown; inspect before allowing any cleanup rule to touch it.',
        sizeBytes: null,
        mtimeMs: null,
        childCount: null,
      })
    }
  }
  return entries
}

/** Summary counts for the status snapshot. */
export interface StructureSummary {
  required: number
  pluginOwned: number
  prunable: number
  unknown: number
  missing: number
}

/**
 * Aggregate the map into marker counts.
 *
 * @param entries - live structure rows.
 */
export function summarizeStructure(entries: readonly StructureEntry[]): StructureSummary {
  const summary: StructureSummary = { required: 0, pluginOwned: 0, prunable: 0, unknown: 0, missing: 0 }
  for (const e of entries) {
    if (e.cls === 'required') summary.required += 1
    else if (e.cls === 'plugin-owned') summary.pluginOwned += 1
    else if (e.cls === 'prunable') summary.prunable += 1
    else summary.unknown += 1
    if (!e.exists) summary.missing += 1
  }
  return summary
}
