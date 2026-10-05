/**
 * Explicit resolve step for the `dsh-home-guard` plugin configuration.
 * `resolveConfig` re-judges every default and bound so programmatic
 * construction that bypasses Schemastery normalization still fails loud
 * instead of running with hidden defaults.
 *
 * @module dsh-home-guard/config
 */
import z from '@deepseek-ai/schemastery';
/** Default tick cadence for the cleanup/purge runner (ms). */
export declare const DEFAULT_TICK_MS = 60000;
/** Minimum tick cadence (ms). */
export declare const MIN_TICK_MS = 15000;
/** Default archived-session purge age (days). */
export declare const DEFAULT_PURGE_OLDER_THAN_DAYS = 30;
/** Default purge interval (minutes). */
export declare const DEFAULT_PURGE_INTERVAL_MINUTES = 60;
/** Default retention for the plugin trash (days). */
export declare const DEFAULT_TRASH_RETENTION_DAYS = 7;
/** Maximum number of cleanup matches one rule may process per run. */
export declare const DEFAULT_MATCH_LIMIT = 500;
/** Maximum archived sessions one purge pass may process. */
export declare const DEFAULT_PURGE_LIMIT = 200;
/** Whether destructive RPCs require an explicit `confirmed` flag. */
export declare const DEFAULT_CONFIRM_REQUIRED = true;
/** Audit log tail size returned by `homeGuard/status` (entries). */
export declare const DEFAULT_AUDIT_TAIL = 40;
/** A user-defined cleanup rule (also the wire shape in `src/wire.ts`). */
export interface CleanupRule {
    /** Stable rule id; runtime rules override config rules with the same id. */
    id: string;
    /** Glob patterns relative to the DSH home directory. */
    paths: string[];
    /** Only match entries whose mtime is older than this many days (null = any). */
    olderThanDays: number | null;
    /** Daily at local HH:MM, or interval every N hours. */
    schedule: {
        kind: 'daily';
        at: string;
    } | {
        kind: 'interval';
        hours: number;
    };
    /** Disabled rules never run and never appear as due. */
    enabled: boolean;
    /** hardDelete removes matched entries instead of moving them to trash. */
    hardDelete: boolean;
}
/** User-defined archived-session purge policy. */
export interface ArchivedPurgeConfig {
    /** Master switch for the timer-based purge. */
    enabled: boolean;
    /** Archived sessions older than this many days are purged. */
    olderThanDays: number;
    /** Interval between purge checks (minutes). */
    intervalMinutes: number;
    /** hardDelete removes session dirs instead of moving them to trash. */
    hardDelete: boolean;
}
/** Configuration for the DSH home structure control plugin. */
export interface Config {
    /** DSH home directory; empty string = $DSH_HOME or ~/.dsh. */
    homeDir?: string;
    /** Master switch for destructive RPCs (delete/purge/cleanup/setRules). */
    writeEnabled?: boolean;
    /** Whether destructive RPCs demand an explicit confirmed flag. */
    confirmRequired?: boolean;
    /** Cleanup runner tick cadence in ms. */
    tickMs?: number;
    /** Archived-session purge policy. */
    archivedPurge?: ArchivedPurgeConfig;
    /** User-defined cleanup rules. */
    cleanupRules?: CleanupRule[];
    /** Days to keep plugin trash before pruning it. */
    trashRetentionDays?: number;
    /** Maximum cleanup matches processed per rule per run. */
    matchLimit?: number;
    /** Maximum archived sessions processed per purge pass. */
    purgeLimit?: number;
    /** Audit entries returned in the status snapshot. */
    auditTail?: number;
}
/** Fully resolved configuration captured at plugin load. */
export interface ResolvedConfig {
    homeDir: string;
    writeEnabled: boolean;
    confirmRequired: boolean;
    tickMs: number;
    archivedPurge: ArchivedPurgeConfig;
    cleanupRules: CleanupRule[];
    trashRetentionDays: number;
    matchLimit: number;
    purgeLimit: number;
    auditTail: number;
}
/** Schemastery schema the plugin Loader validates config against. */
export declare const Config: z<Config>;
/** Registry form of a session id (`session-<uuid>`). */
export declare const SESSION_ID_PREFIX = "session-";
/**
 * Validate one cleanup rule. Returns an error string for invalid rules,
 * `null` when the rule is acceptable.
 *
 * @param rule - candidate rule (untrusted shape).
 */
export declare function validateRule(rule: unknown): string | null;
/**
 * Normalize a validated rule (defaults for enabled/hardDelete/olderThanDays).
 *
 * @param rule - a rule that already passed {@link validateRule}.
 */
export declare function normalizeRule(rule: Record<string, unknown>): CleanupRule;
/**
 * Validate + normalize a whole rules array; invalid entries are rejected with
 * per-entry reasons instead of failing the batch.
 *
 * @param raw - candidate rules array (untrusted).
 */
export declare function resolveRules(raw: unknown): {
    accepted: CleanupRule[];
    rejected: {
        id: string;
        reason: string;
    }[];
};
/**
 * Validate a session id: registry form `session-<uuid>` or bare `<uuid>`.
 *
 * @param id - candidate session id.
 */
export declare function isValidSessionId(id: unknown): id is string;
/**
 * Strip the `session-` prefix; bare uuids pass through.
 *
 * @param id - registry or bare session id.
 */
export declare function sessionUuidOf(id: string): string;
/**
 * Registry form of a session id.
 *
 * @param uuid - bare uuid.
 */
export declare function sessionIdOf(uuid: string): string;
/**
 * Resolve the raw loader config into a fully judged {@link ResolvedConfig}.
 * Every bound is re-checked here so programmatic construction bypassing
 * Schemastery normalization still fails loud.
 *
 * @param raw - raw loader config (already Schemastery-normalized in practice).
 */
export declare function resolveConfig(raw: Config | undefined): ResolvedConfig;
