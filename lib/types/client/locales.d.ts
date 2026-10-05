/**
 * Locale dictionaries for the Home Guard tab. The harness locale registry
 * accepts only the 'en' | 'zh' UI language codes today, so the tab ships
 * those two dictionaries and follows the app's UI language.
 *
 * @module dsh-home-guard/client/locales
 */
/** Locale key union for the Home Guard tab copy. */
export type HomeGuardLocaleKey = 'tab' | 'section.structure' | 'section.sessions' | 'section.cleanup' | 'section.audit' | 'structure.required' | 'structure.pluginOwned' | 'structure.prunable' | 'structure.unknown' | 'structure.exists' | 'structure.missing' | 'structure.size' | 'structure.children' | 'structure.owner' | 'structure.description' | 'sessions.title' | 'sessions.project' | 'sessions.size' | 'sessions.created' | 'sessions.modified' | 'sessions.archived' | 'sessions.locked' | 'sessions.current' | 'sessions.none' | 'sessions.showArchived' | 'sessions.archive' | 'sessions.unarchive' | 'sessions.delete' | 'sessions.deleteHard' | 'sessions.refresh' | 'cleanup.rules' | 'cleanup.noRules' | 'cleanup.ruleId' | 'cleanup.paths' | 'cleanup.olderThan' | 'cleanup.schedule' | 'cleanup.scheduleDaily' | 'cleanup.scheduleInterval' | 'cleanup.enabled' | 'cleanup.hardDelete' | 'cleanup.addRule' | 'cleanup.rulesJson' | 'cleanup.saveRules' | 'cleanup.runDry' | 'cleanup.run' | 'cleanup.purge' | 'cleanup.purgeDry' | 'cleanup.purgeStatus' | 'audit.ts' | 'audit.kind' | 'audit.outcome' | 'audit.path' | 'audit.detail' | 'audit.none' | 'common.refresh' | 'common.confirm' | 'common.cancel' | 'common.close' | 'common.loading' | 'common.error' | 'common.home' | 'common.writeOff' | 'common.lastTickError' | 'common.lastRun' | 'common.bytes' | 'common.matched' | 'common.deleted' | 'common.markRequired' | 'common.markPlugin' | 'common.markPrunable' | 'common.markUnknown' | 'common.usage' | 'common.dryRun' | 'common.done';
/** English dictionary. */
export declare const en: Record<HomeGuardLocaleKey, string>;
/** Chinese dictionary. */
export declare const zh: Record<HomeGuardLocaleKey, string>;
