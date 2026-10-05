/**
 * Session listing, archive/unarchive through the core workspace registry,
 * and guarded delete (trash-first). Archive is a registry state-list — this
 * module never moves session directories for archive/unarchive. Delete is
 * plugin-side because core exposes no session-delete API.
 *
 * @module dsh-home-guard/sessions
 */
/** One session row for the viewer. */
export interface SessionRow {
    /** Registry-form id (`session-<uuid>`). */
    id: string;
    /** Bare uuid (directory name). */
    uuid: string;
    /** Project slug (home-relative directory under sessions/). */
    projectSlug: string;
    /** Title from the projection cache, when resolvable. */
    title: string | null;
    /** Creation time from the zstd header, when resolvable. */
    createdAtMs: number | null;
    /** Directory mtime (ms epoch). */
    mtimeMs: number | null;
    /** Directory size in bytes (best effort). */
    sizeBytes: number | null;
    /** Whether the registry marks this session archived. */
    archived: boolean;
    /** Whether a session.lock file exists. */
    locked: boolean;
    /** True when this is the session currently open in the GUI (best effort). */
    isCurrent: boolean;
}
/** Workspace registry face (structural: rc.2 facade). */
export interface WorkspaceRegistryFace {
    archiveSession(id: string): Promise<void> | void;
    unarchiveSession(id: string): Promise<void> | void;
    readonly archivedSessionIds: readonly string[];
}
/**
 * Read archived session ids from `storages/workspace.json` (read-only).
 * Returns null when the file is missing or unparsable.
 *
 * @param workspaceState - absolute path of workspace.json.
 */
export declare function readArchivedIds(workspaceState: string): Promise<Set<string> | null>;
/**
 * Read session titles from `storages/session_projcache.json` (read-only).
 * Returns an empty map when the file is missing or unparsable.
 *
 * @param projCache - absolute path of the projection cache.
 */
export declare function readSessionTitles(projCache: string): Promise<Map<string, string>>;
/**
 * Parse `createdAt` from the first JSONL line of a zstd session log.
 * Returns null when zstd is unavailable or the header is unparseable.
 *
 * @param logFile - absolute path of `session.v4.jsonl.zstd`.
 */
export declare function readSessionCreatedAt(logFile: string): Promise<number | null>;
/** Options for {@link listSessions}. */
export interface ListSessionsOptions {
    /** Include archived sessions in the result. */
    includeArchived: boolean;
    /** Registry-form id of the session currently open in the GUI. */
    currentSessionId?: string | null;
    /** Cap on rows returned (newest first after sorting by mtime). */
    limit?: number;
}
/**
 * List sessions under `<home>/sessions/<slug>/<uuid>/`.
 *
 * @param homePaths - resolved plugin paths.
 * @param options - listing options.
 */
export declare function listSessions(homePaths: {
    sessions: string;
    workspaceState: string;
    projCache: string;
}, options: ListSessionsOptions): Promise<SessionRow[]>;
/** Delete guard outcome. */
export type DeleteGuard = {
    ok: true;
} | {
    ok: false;
    reason: string;
};
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
export declare function checkDeleteGuards(id: string, currentSessionId: string | null | undefined, locked: boolean, lockMtimeMs: number | null, now: number): DeleteGuard;
/**
 * Resolve the on-disk directory for a session id by scanning `sessions/`.
 * Returns null when no uuid directory matches.
 *
 * @param sessionsRoot - absolute sessions directory.
 * @param id - registry-form or bare session id.
 */
export declare function findSessionDir(sessionsRoot: string, id: string): Promise<{
    dir: string;
    slug: string;
} | null>;
/** Delete result. */
export interface DeleteSessionResult {
    ok: boolean;
    /** Absolute path the session dir was moved to (trash), when moved. */
    targetPath?: string | null;
    /** Refusal/error reason. */
    reason?: string;
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
export declare function deleteSessionDir(sessionsRoot: string, trashRoot: string, id: string, options?: {
    hardDelete?: boolean;
    currentSessionId?: string | null;
    locked?: boolean;
    lockMtimeMs?: number | null;
}): Promise<DeleteSessionResult>;
/** Archive/unarchive outcome. */
export interface RegistryOpResult {
    ok: boolean;
    reason?: string;
}
/**
 * Archive a session through the core workspace registry. Idempotent append;
 * the registry is the single source of truth.
 *
 * @param registry - workspace registry face (may be undefined → unavailable).
 * @param id - registry-form session id.
 */
export declare function archiveSessionVia(registry: WorkspaceRegistryFace | undefined, id: string): Promise<RegistryOpResult>;
/**
 * Unarchive a session through the core workspace registry (filter-out).
 *
 * @param registry - workspace registry face (may be undefined → unavailable).
 * @param id - registry-form session id.
 */
export declare function unarchiveSessionVia(registry: WorkspaceRegistryFace | undefined, id: string): Promise<RegistryOpResult>;
/**
 * Collect archived session ids eligible for purge: archived in the registry,
 * directory exists, and mtime older than `olderThanDays`.
 *
 * @param homePaths - plugin paths.
 * @param olderThanDays - age threshold.
 * @param limit - max rows to return.
 */
export declare function collectPurgeCandidates(homePaths: {
    sessions: string;
    workspaceState: string;
    projCache: string;
}, olderThanDays: number, limit: number): Promise<SessionRow[]>;
