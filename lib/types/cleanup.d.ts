/**
 * Cleanup engine: glob matching over the home tree, trash-first rule
 * execution, schedule math, and trash retention pruning. Every deletion is
 * denylist-checked twice (config validation + runtime) and audited.
 *
 * @module dsh-home-guard/cleanup
 */
import type { CleanupRule } from './config.ts';
/** One matched file/directory under the home root. */
export interface MatchEntry {
    /** Home-relative path (forward slashes). */
    relPath: string;
    /** Absolute path. */
    absPath: string;
    /** Whether the entry is a directory. */
    isDir: boolean;
    /** Size in bytes (files: size; dirs: null until measured). */
    sizeBytes: number | null;
    /** mtime in ms epoch. */
    mtimeMs: number;
}
/** Options for {@link collectMatches}. */
export interface CollectOptions {
    /** Only match entries whose mtime is older than this many days. */
    olderThanDays: number | null;
    /** Current epoch ms (test seam). */
    now: number;
    /** Max matched entries returned. */
    limit: number;
    /** Max directory recursion depth. */
    maxDepth: number;
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
export declare function collectMatches(homeRoot: string, patterns: readonly string[], options: CollectOptions): Promise<MatchEntry[]>;
/** Result of one rule execution. */
export interface RuleRunResult {
    ok: boolean;
    ruleId: string;
    /** Matched entries. */
    matched: number;
    /** Entries actually deleted/moved. */
    deleted: number;
    /** Bytes affected (best effort). */
    bytes: number;
    /** Refused entries (denylist double-check tripped). */
    refused: number;
    /** Refusal/error details. */
    details: string[];
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
export declare function runRule(homeRoot: string, trashRoot: string, rule: CleanupRule, options?: {
    dryRun?: boolean;
    now?: number;
    limit?: number;
}): Promise<RuleRunResult>;
/**
 * Is a rule due at `nowMs`? Daily rules fire once per local calendar day at
 * HH:MM; interval rules fire when `now - lastRun >= hours`. Enabled=false
 * rules are never due.
 *
 * @param rule - the rule.
 * @param lastRunMs - last run epoch ms (0 = never).
 * @param nowMs - current epoch ms.
 */
export declare function isRuleDue(rule: CleanupRule, lastRunMs: number, nowMs: number): boolean;
/**
 * Prune plugin trash entries older than `retentionDays`. Directories are
 * removed recursively; the trash root itself is kept.
 *
 * @param trashRoot - absolute plugin trash directory.
 * @param retentionDays - age threshold (0 disables pruning).
 * @param now - current epoch ms.
 */
export declare function pruneTrash(trashRoot: string, retentionDays: number, now: number): Promise<{
    pruned: number;
    bytes: number;
}>;
/**
 * Reject rules that would touch denylisted paths. Called at config validation
 * and at setRules time (double gate). Returns refusal reasons per pattern.
 *
 * @param patterns - glob patterns from a rule.
 */
export declare function checkRulePatterns(patterns: readonly string[]): string[];
/**
 * Compute the relative home path of an absolute path (forward slashes).
 *
 * @param homeRoot - absolute home root.
 * @param abs - absolute candidate path.
 */
export declare function relOf(homeRoot: string, abs: string): string;
