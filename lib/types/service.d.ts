/**
 * Host service: mounts the `homeGuard` Typert Remote contribution and wires
 * structure scanning, session management, cleanup rules, archived purge,
 * and trash retention to remote methods + the tick timer.
 *
 * @module dsh-home-guard/service
 */
import type { Context } from '@deepseek-ai/cordis';
import type { ResolvedConfig } from './config.ts';
import type { AuditRecordWire, OpResultWire, SetRulesResultWire, SessionListWire, HomeGuardStatusWire } from './wire.ts';
/**
 * HomeGuard service: structure map, sessions, cleanup, purge, audit.
 * Plain class — no `extends TypertRemoteService` (the rc.2 protocol package
 * resolves its own cordis copy under pnpm; a foreign `Service` base breaks
 * host activation). The `typertRemote` binding is hand-written in
 * `src/index.ts` (the dsh-cost-meter pattern).
 * Timer: one unref'd interval driven by config.tickMs; every run is
 * guarded against overlap and never throws out of the interval.
 */
export declare class HomeGuardService {
    /** Hard dependencies of this service (registry is read softly). */
    static inject: string[];
    private readonly ctx;
    private readonly cfg;
    private readonly paths;
    private timer;
    private disposed;
    private tickState;
    private runtimeRules;
    private ruleRuns;
    private lastTickError;
    private registry;
    /**
     * @param ctx - cordis context.
     * @param config - resolved plugin config.
     */
    constructor(ctx: Context, config: ResolvedConfig);
    /**
     * Load persisted tick state + runtime rules; then arm the timer.
     * Failures are recorded, never fatal.
     */
    private bootstrap;
    /**
     * Read `state.json` (tolerant).
     */
    private loadTickState;
    /**
     * Persist tick state (tolerant; never throws to callers).
     */
    private saveTickState;
    /**
     * Read runtime rules from `rules.json` (tolerant; invalid entries skipped).
     */
    private loadRuntimeRules;
    /**
     * Persist runtime rules (tolerant).
     */
    private saveRuntimeRules;
    /**
     * Effective rules: runtime overrides config by id, runtime-only additions
     * appended in order.
     */
    private effectiveRules;
    /**
     * Wire copy of a rule.
     *
     * @param rule - internal rule.
     */
    private toWire;
    /**
     * Wire copy of a session row.
     *
     * @param row - internal session row.
     */
    private sessionWire;
    /**
     * Build an OpResult.
     *
     * @param ok - success flag.
     * @param code - machine-readable result code.
     * @param message - human-readable detail.
     */
    private op;
    /**
     * Append an audit record.
     *
     * @param record - the record (ts filled in when absent).
     */
    private audit;
    /**
     * Full status snapshot: structure map + sessions + cleanup + audit tail.
     * Scans are sequential; sizes are best-effort (`du -sb`).
     */
    status(): Promise<HomeGuardStatusWire>;
    /**
     * List sessions; archived included per flag.
     *
     * @param includeArchived - include registry-archived sessions.
     */
    listSessions(includeArchived: boolean): Promise<SessionListWire>;
    /**
     * Archive a session via the core workspace registry. No disk move.
     *
     * @param id - registry-form session id.
     * @param confirmed - destructive-op confirmation flag.
     */
    archiveSession(id: string, confirmed: boolean): Promise<OpResultWire>;
    /**
     * Unarchive a session via the core workspace registry (idempotent filter).
     *
     * @param id - registry-form session id.
     */
    unarchiveSession(id: string): Promise<OpResultWire>;
    /**
     * Delete a session directory: trash-first (default) or hardDelete opt-in.
     * Guards: uuid shape, directory inside sessions/, not current, lock grace.
     *
     * @param id - session id.
     * @param confirmed - destructive-op confirmation flag.
     * @param currentSessionId - GUI current session id (routed approval).
     * @param hardDelete - skip trash (irreversible).
     */
    deleteSession(id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean): Promise<OpResultWire>;
    /**
     * Purge archived sessions older than the configured threshold.
     *
     * @param confirmed - destructive-op confirmation flag.
     * @param dryRun - collect and report without deleting.
     */
    purgeArchived(confirmed: boolean, dryRun: boolean): Promise<OpResultWire>;
    /**
     * Run one cleanup rule (or `all`): denylist double-gate, trash-first,
     * audit + state update.
     *
     * @param ruleId - rule id or `all`.
     * @param confirmed - destructive-op confirmation flag.
     * @param dryRun - collect and report without deleting.
     */
    runCleanup(ruleId: string, confirmed: boolean, dryRun: boolean): Promise<OpResultWire>;
    /**
     * Replace the runtime rule list (persisted to our own unit, never
     * cordis.patch.yml). Runtime rules override config rules by id.
     *
     * @param rulesJson - JSON array of rules (untrusted).
     * @param confirmed - destructive-op confirmation flag.
     */
    setRules(rulesJson: string, confirmed: boolean): Promise<SetRulesResultWire>;
    /**
     * Read the audit tail.
     *
     * @param limit - max records.
     */
    getAudit(limit: number): Promise<{
        records: AuditRecordWire[];
    }>;
    /**
     * Run one timer tick on demand: archived purge + trash retention prune.
     * Also used internally by the interval timer.
     *
     * @param confirmed - gate (tick uses internal false → skipped unless due).
     */
    runTick(confirmed: boolean): Promise<OpResultWire>;
    /**
     * Destructive-op gate: writeEnabled switch + confirmation flag.
     *
     * @param confirmed - client confirmation flag.
     */
    private gateWrite;
}
