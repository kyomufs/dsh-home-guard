/**
 * The client-side Remote face of the `homeGuard` namespace: the hand-written
 * `TypertRemoteContribution` mounted through `ctx.remote.$mount`, plus the
 * declaration merging that types `ctx.remote.homeGuard`. The descriptor list
 * is shared with the host `./typert` manifest (`../wire.ts`), so the two
 * faces can never drift.
 *
 * @module dsh-home-guard/client/remote
 */
import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol';
import type { AuditTailWire, HomeGuardStatusWire, OpResultWire, SessionListWire, SetRulesResultWire } from '../wire.ts';
declare module '@deepseek-ai/dsh-typert-protocol' {
    interface TypertRemoteNamespace$homeGuard {
        /** Full status snapshot: structure map, sessions, cleanup, audit tail. */
        status: () => Promise<RemoteResult<HomeGuardStatusWire>>;
        /** List sessions; archived included per flag. */
        listSessions: (includeArchived: boolean) => Promise<RemoteResult<SessionListWire>>;
        /** Archive a session via the core workspace registry. */
        archiveSession: (id: string, confirmed: boolean) => Promise<RemoteResult<OpResultWire>>;
        /** Unarchive a session via the core workspace registry. */
        unarchiveSession: (id: string) => Promise<RemoteResult<OpResultWire>>;
        /** Delete a session directory (trash-first; hardDelete opt-in). */
        deleteSession: (id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean) => Promise<RemoteResult<OpResultWire>>;
        /** Purge archived sessions older than the configured threshold. */
        purgeArchived: (confirmed: boolean, dryRun: boolean) => Promise<RemoteResult<OpResultWire>>;
        /** Run one cleanup rule (or `all`); dry-run collects without deleting. */
        runCleanup: (ruleId: string, confirmed: boolean, dryRun: boolean) => Promise<RemoteResult<OpResultWire>>;
        /** Replace the runtime rule list (persisted to the plugin unit). */
        setRules: (rulesJson: string, confirmed: boolean) => Promise<RemoteResult<SetRulesResultWire>>;
        /** Read the audit tail. */
        getAudit: (limit: number) => Promise<RemoteResult<AuditTailWire>>;
    }
    interface TypertRemoteMap {
        'homeGuard/status': () => Promise<RemoteResult<HomeGuardStatusWire>>;
        'homeGuard/listSessions': (includeArchived: boolean) => Promise<RemoteResult<SessionListWire>>;
        'homeGuard/archiveSession': (id: string, confirmed: boolean) => Promise<RemoteResult<OpResultWire>>;
        'homeGuard/unarchiveSession': (id: string) => Promise<RemoteResult<OpResultWire>>;
        'homeGuard/deleteSession': (id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean) => Promise<RemoteResult<OpResultWire>>;
        'homeGuard/purgeArchived': (confirmed: boolean, dryRun: boolean) => Promise<RemoteResult<OpResultWire>>;
        'homeGuard/runCleanup': (ruleId: string, confirmed: boolean, dryRun: boolean) => Promise<RemoteResult<OpResultWire>>;
        'homeGuard/setRules': (rulesJson: string, confirmed: boolean) => Promise<RemoteResult<SetRulesResultWire>>;
        'homeGuard/getAudit': (limit: number) => Promise<RemoteResult<AuditTailWire>>;
    }
    interface TypertRemoteNamespaceMap {
        homeGuard: TypertRemoteNamespace$homeGuard;
    }
}
/** The client Remote contribution for the `homeGuard` namespace. */
export declare const HOME_GUARD_REMOTE: Readonly<{
    package: string;
    descriptors: readonly import("@deepseek-ai/dsh-typert-protocol").InvocationDescriptor[];
}>;
export default HOME_GUARD_REMOTE;
