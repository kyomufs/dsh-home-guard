/**
 * Filesystem layout of the DSH home directory plus the protection denylist.
 * Every destructive path in this plugin funnels through here first.
 *
 * @module dsh-home-guard/paths
 */
/** Relative directories and files that may never be deleted by this plugin. */
export declare const PROTECTED_ENTRIES: readonly string[];
/**
 * Resolve the DSH home directory: explicit config > $DSH_HOME > ~/.dsh.
 *
 * @param homeDir - config value; empty string means "not set".
 */
export declare function resolveHomeDir(homeDir: string | undefined): string;
/** Canonical plugin-owned locations inside the DSH home. */
export interface HomePaths {
    /** Root of the DSH home. */
    readonly root: string;
    /** Session storage (`<root>/sessions`). */
    readonly sessions: string;
    /** Storage units (`<root>/storages`). */
    readonly storages: string;
    /** Workspace registry state file (`<root>/storages/workspace.json`). */
    readonly workspaceState: string;
    /** Session projection cache (`<root>/storages/session_projcache.json`). */
    readonly projCache: string;
    /** Plugin storage unit (`<root>/storages/dsh-home-guard`). */
    readonly unitDir: string;
    /** Runtime rules file (`<unitDir>/rules.json`). */
    readonly rulesFile: string;
    /** Audit log file (`<unitDir>/audit.log`). */
    readonly auditFile: string;
    /** State file for timers (`<unitDir>/state.json`). */
    readonly stateFile: string;
    /** Plugin trash root (`<root>/trash/dsh-home-guard`). */
    readonly trash: string;
}
/**
 * Build the canonical {@link HomePaths} for a home directory.
 *
 * @param homeRoot - absolute DSH home directory.
 */
export declare function homePaths(homeRoot: string): HomePaths;
/**
 * Normalize a path to forward slashes without a leading `./`.
 *
 * @param p - raw path.
 */
export declare function normalizeRel(p: string): string;
/**
 * Is a path protected by the denylist? Checks top-level names and any
 * `storages/<name>` subpath against {@link PROTECTED_ENTRIES}. The plugin's
 * own storage unit `storages/dsh-home-guard` is deliberately NOT protected
 * (it is ours to manage), and `trash/` is likewise ours.
 *
 * @param relPath - path relative to the home root, forward slashes.
 */
export declare function isProtected(relPath: string): boolean;
/**
 * Resolve a rule path pattern against the home root and confirm the result
 * stays inside it (symlink escapes are rejected by the realpath check at
 * match time; this guards lexical traversal).
 *
 * @param homeRoot - absolute home directory.
 * @param pattern - glob pattern relative to the home root.
 */
export declare function safeJoin(homeRoot: string, pattern: string): string | null;
/**
 * Is `abs` inside `parent` (or equal to it)? Uses path boundaries, not a
 * naive prefix test (`/a/bc` is NOT inside `/a/b`).
 *
 * @param parent - candidate parent directory (absolute).
 * @param abs - candidate child path (absolute).
 */
export declare function isInside(parent: string, abs: string): boolean;
