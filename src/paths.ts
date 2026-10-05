/**
 * Filesystem layout of the DSH home directory plus the protection denylist.
 * Every destructive path in this plugin funnels through here first.
 *
 * @module dsh-home-guard/paths
 */

import { homedir } from 'node:os'
import { join, relative, resolve, sep } from 'node:path'

/** Relative directories and files that may never be deleted by this plugin. */
export const PROTECTED_ENTRIES: readonly string[] = Object.freeze([
  'sessions',
  'attachments',
  '.credentials.yaml',
  'profiles',
  'skills',
  'AGENTS.md',
  '.git',
  'dsh-usage',
  'state',
])

/**
 * Resolve the DSH home directory: explicit config > $DSH_HOME > ~/.dsh.
 *
 * @param homeDir - config value; empty string means "not set".
 */
export function resolveHomeDir(homeDir: string | undefined): string {
  const explicit = (homeDir ?? '').trim()
  if (explicit !== '') return resolve(explicit)
  const env = (process.env.DSH_HOME ?? '').trim()
  if (env !== '') return resolve(env)
  return join(homedir(), '.dsh')
}

/** Canonical plugin-owned locations inside the DSH home. */
export interface HomePaths {
  /** Root of the DSH home. */
  readonly root: string
  /** Session storage (`<root>/sessions`). */
  readonly sessions: string
  /** Storage units (`<root>/storages`). */
  readonly storages: string
  /** Workspace registry state file (`<root>/storages/workspace.json`). */
  readonly workspaceState: string
  /** Session projection cache (`<root>/storages/session_projcache.json`). */
  readonly projCache: string
  /** Plugin storage unit (`<root>/storages/dsh-home-guard`). */
  readonly unitDir: string
  /** Runtime rules file (`<unitDir>/rules.json`). */
  readonly rulesFile: string
  /** Audit log file (`<unitDir>/audit.log`). */
  readonly auditFile: string
  /** State file for timers (`<unitDir>/state.json`). */
  readonly stateFile: string
  /** Plugin trash root (`<root>/trash/dsh-home-guard`). */
  readonly trash: string
}

/**
 * Build the canonical {@link HomePaths} for a home directory.
 *
 * @param homeRoot - absolute DSH home directory.
 */
export function homePaths(homeRoot: string): HomePaths {
  const root = resolve(homeRoot)
  const unitDir = join(root, 'storages', 'dsh-home-guard')
  return {
    root,
    sessions: join(root, 'sessions'),
    storages: join(root, 'storages'),
    workspaceState: join(root, 'storages', 'workspace.json'),
    projCache: join(root, 'storages', 'session_projcache.json'),
    unitDir,
    rulesFile: join(unitDir, 'rules.json'),
    auditFile: join(unitDir, 'audit.log'),
    stateFile: join(unitDir, 'state.json'),
    trash: join(root, 'trash', 'dsh-home-guard'),
  }
}

/**
 * Normalize a path to forward slashes without a leading `./`.
 *
 * @param p - raw path.
 */
export function normalizeRel(p: string): string {
  return p
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/+$/, '')
}

/**
 * Is a path protected by the denylist? Checks top-level names and any
 * `storages/<name>` subpath against {@link PROTECTED_ENTRIES}. The plugin's
 * own storage unit `storages/dsh-home-guard` is deliberately NOT protected
 * (it is ours to manage), and `trash/` is likewise ours.
 *
 * @param relPath - path relative to the home root, forward slashes.
 */
export function isProtected(relPath: string): boolean {
  const rel = normalizeRel(relPath)
  if (rel === '' || rel === '.') return true
  const segments = rel.split('/').filter((s) => s !== '' && s !== '.')
  if (segments.length === 0) return true
  const head = segments[0]
  const second = segments[1]
  if (head === undefined) return true
  if (head === 'storages') {
    // Only our own unit and the plugin trash are unprotected.
    if (second === undefined) return true
    return second !== 'dsh-home-guard'
  }
  if (head === 'trash') return false
  return PROTECTED_ENTRIES.includes(head)
}

/**
 * Resolve a rule path pattern against the home root and confirm the result
 * stays inside it (symlink escapes are rejected by the realpath check at
 * match time; this guards lexical traversal).
 *
 * @param homeRoot - absolute home directory.
 * @param pattern - glob pattern relative to the home root.
 */
export function safeJoin(homeRoot: string, pattern: string): string | null {
  const rel = normalizeRel(pattern)
  if (rel === '' || rel === '.' || rel === '..') return null
  const segments = rel.split('/')
  if (segments.some((s) => s === '..')) return null
  const abs = resolve(homeRoot, rel)
  const relBack = relative(resolve(homeRoot), abs)
  if (relBack.startsWith('..') || resolve(homeRoot, relBack) !== abs) return null
  return abs
}

/**
 * Is `abs` inside `parent` (or equal to it)? Uses path boundaries, not a
 * naive prefix test (`/a/bc` is NOT inside `/a/b`).
 *
 * @param parent - candidate parent directory (absolute).
 * @param abs - candidate child path (absolute).
 */
export function isInside(parent: string, abs: string): boolean {
  const p = resolve(parent)
  const a = resolve(abs)
  if (a === p) return true
  return a.startsWith(p.endsWith(sep) ? p : p + sep)
}
