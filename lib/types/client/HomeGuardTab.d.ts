/**
 * Home Guard tab: structure map, session viewer, cleanup/purge console, and
 * the audit tail. All data flows through the `remote.homeGuard` namespace;
 * the component holds no state of its own beyond section selection, loaded
 * snapshots, and transient action feedback.
 *
 * @module dsh-home-guard/client/HomeGuardTab
 */
import type { ReactElement } from 'react';
import type { AuditRecordWire, HomeGuardStatusWire, OpResultWire, SessionListWire, SetRulesResultWire } from '../wire.ts';
import type { HomeGuardLocaleKey } from './locales.ts';
/** RPC face injected by the plugin's client entry (all calls pre-unwrapped). */
export interface HomeGuardTabInjected {
    status: () => Promise<HomeGuardStatusWire>;
    listSessions: (includeArchived: boolean) => Promise<SessionListWire>;
    archiveSession: (id: string, confirmed: boolean) => Promise<OpResultWire>;
    unarchiveSession: (id: string) => Promise<OpResultWire>;
    deleteSession: (id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean) => Promise<OpResultWire>;
    purgeArchived: (confirmed: boolean, dryRun: boolean) => Promise<OpResultWire>;
    runCleanup: (ruleId: string, confirmed: boolean, dryRun: boolean) => Promise<OpResultWire>;
    setRules: (rulesJson: string, confirmed: boolean) => Promise<SetRulesResultWire>;
    getAudit: (limit: number) => Promise<{
        records: AuditRecordWire[];
    }>;
    /** Locale lookup for the registered namespace. */
    t: (key: HomeGuardLocaleKey) => string;
    /** Current GUI session id (approval routing), read at call time. */
    currentSessionId: () => string | null;
}
/** Component props. */
export interface HomeGuardTabProps {
    injected: HomeGuardTabInjected;
}
/**
 * Home Guard tab component.
 *
 * @param props - component props with the injected RPC face.
 */
export declare function HomeGuardTab(props: HomeGuardTabProps): ReactElement;
export default HomeGuardTab;
