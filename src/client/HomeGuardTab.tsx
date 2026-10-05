/**
 * Home Guard tab: structure map, session viewer, cleanup/purge console, and
 * the audit tail. All data flows through the `remote.homeGuard` namespace;
 * the component holds no state of its own beyond section selection, loaded
 * snapshots, and transient action feedback.
 *
 * @module dsh-home-guard/client/HomeGuardTab
 */

import { useCallback, useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import type {
  AuditRecordWire,
  HomeGuardStatusWire,
  OpResultWire,
  SessionListWire,
  SetRulesResultWire,
  CleanupRuleWire,
} from '../wire.ts'
import type { HomeGuardLocaleKey } from './locales.ts'

/** RPC face injected by the plugin's client entry (all calls pre-unwrapped). */
export interface HomeGuardTabInjected {
  status: () => Promise<HomeGuardStatusWire>
  listSessions: (includeArchived: boolean) => Promise<SessionListWire>
  archiveSession: (id: string, confirmed: boolean) => Promise<OpResultWire>
  unarchiveSession: (id: string) => Promise<OpResultWire>
  deleteSession: (id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean) => Promise<OpResultWire>
  purgeArchived: (confirmed: boolean, dryRun: boolean) => Promise<OpResultWire>
  runCleanup: (ruleId: string, confirmed: boolean, dryRun: boolean) => Promise<OpResultWire>
  setRules: (rulesJson: string, confirmed: boolean) => Promise<SetRulesResultWire>
  getAudit: (limit: number) => Promise<{ records: AuditRecordWire[] }>
  /** Locale lookup for the registered namespace. */
  t: (key: HomeGuardLocaleKey) => string
  /** Current GUI session id (approval routing), read at call time. */
  currentSessionId: () => string | null
}

/** Component props. */
export interface HomeGuardTabProps {
  injected: HomeGuardTabInjected
}

/** Section identifiers. */
type Section = 'structure' | 'sessions' | 'cleanup'

/** Human byte size. */
function fmtBytes(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes)) return '—'
  if (bytes < 1024) return `${bytes} B`
  const units = ['KiB', 'MiB', 'GiB', 'TiB']
  let v = bytes
  let i = -1
  do {
    v /= 1024
    i += 1
  } while (v >= 1024 && i < units.length - 1)
  return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`
}

/** Short timestamp. */
function fmtTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return '—'
  const d = new Date(ms)
  return d.toLocaleString()
}

/** Marker for a structure class. */
function markerFor(cls: string): { glyph: string; dotClass: string } {
  if (cls === 'required') return { glyph: '🟢', dotClass: 'hg-dot-required' }
  if (cls === 'plugin-owned') return { glyph: '🔵', dotClass: 'hg-dot-plugin' }
  if (cls === 'prunable') return { glyph: '🟡', dotClass: 'hg-dot-prunable' }
  return { glyph: '⚪', dotClass: 'hg-dot-unknown' }
}

/** Human schedule line. */
function fmtSchedule(rule: CleanupRuleWire, t: (k: HomeGuardLocaleKey) => string): string {
  return rule.schedule.kind === 'daily'
    ? `${t('cleanup.scheduleDaily')} ${rule.schedule.at}`
    : `${t('cleanup.scheduleInterval')} ${rule.schedule.hours}h`
}

/**
 * Home Guard tab component.
 *
 * @param props - component props with the injected RPC face.
 */
export function HomeGuardTab(props: HomeGuardTabProps): ReactElement {
  const { injected } = props
  const t = injected.t
  const [section, setSection] = useState<Section>('structure')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const [status, setStatus] = useState<HomeGuardStatusWire | null>(null)
  const [sessionList, setSessionList] = useState<SessionListWire | null>(null)
  const [showArchived, setShowArchived] = useState(false)
  const [rulesJson, setRulesJson] = useState('')

  const refresh = useCallback(async (): Promise<void> => {
    setLoading(true)
    setError(null)
    setOk(null)
    try {
      const next = await injected.status()
      setStatus(next)
      setRulesJson(JSON.stringify(next.cleanupRules, null, 2))
      const sessions = await injected.listSessions(true)
      setSessionList(sessions)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    } finally {
      setLoading(false)
    }
  }, [injected])

  useEffect(() => {
    void refresh()
  }, [refresh])

  /** Shared action wrapper: run an op, surface ok/error, refresh on success. */
  const act = useCallback(async (fn: () => Promise<OpResultWire>, successText: string): Promise<void> => {
    setError(null)
    setOk(null)
    try {
      const result = await fn()
      if (result.ok) {
        setOk(`${successText} · ${result.message ?? result.code}${result.deleted > 0 ? ` · ${t('common.deleted')}=${result.deleted}` : ''}`)
        await refresh()
      } else {
        setError(`${result.code}: ${result.message ?? ''}`)
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason))
    }
  }, [refresh, t])

  const sessions = sessionList?.sessions ?? (status?.sessions ?? [])
  const visibleSessions = showArchived ? sessions : sessions.filter((r) => !r.archived)

  return (
    <div className="hg-root">
      <div className="hg-tabs" role="tablist">
        {(['structure', 'sessions', 'cleanup'] as Section[]).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={section === s}
            className="hg-tab"
            onClick={() => setSection(s)}
          >
            {s === 'structure' ? t('section.structure') : s === 'sessions' ? t('section.sessions') : t('section.cleanup')}
          </button>
        ))}
      </div>

      <div className="hg-card">
        <div className="hg-meta">
          {t('common.home')}: <span className="hg-path">{status?.homeDir ?? '—'}</span>
          {' · '}
          write={status?.writeEnabled ? 'on' : 'off'}
          {' · '}
          confirm={status?.confirmRequired ? 'required' : 'optional'}
        </div>
        {status !== null && status.writeEnabled === false && <div className="hg-error">{t('common.writeOff')}</div>}
        <div className="hg-actions">
          <button type="button" className="hg-btn" disabled={loading} onClick={() => void refresh()}>
            {loading ? t('common.loading') : t('common.refresh')}
          </button>
        </div>
        {error !== null && <div className="hg-error">{error}</div>}
        {ok !== null && <div className="hg-ok">{ok}</div>}
      </div>

      {section === 'structure' && status !== null && (
        <div className="hg-card">
          <h3>
            {t('section.structure')} · {t('common.markRequired')} {status.structureSummary.required} ·{' '}
            {t('common.markPlugin')} {status.structureSummary.pluginOwned} · {t('common.markPrunable')}{' '}
            {status.structureSummary.prunable} · {t('common.markUnknown')} {status.structureSummary.unknown} ·{' '}
            {t('structure.missing')} {status.structureSummary.missing}
          </h3>
          <div className="hg-scroll">
            <table className="hg-table">
              <thead>
                <tr>
                  <th />
                  <th>path</th>
                  <th>{t('structure.owner')}</th>
                  <th>{t('structure.size')}</th>
                  <th>{t('structure.children')}</th>
                  <th>{t('sessions.modified')}</th>
                </tr>
              </thead>
              <tbody>
                {status.structure.map((entry) => {
                  const marker = markerFor(entry.cls)
                  return (
                    <tr key={entry.path} title={`${entry.origin} · ${entry.description}`}>
                      <td className={marker.dotClass}>{marker.glyph}</td>
                      <td className="hg-path">
                        {entry.path}
                        {!entry.exists && <span className="hg-badge">{t('structure.missing')}</span>}
                      </td>
                      <td>{entry.owner ?? '—'}</td>
                      <td className="num">{fmtBytes(entry.sizeBytes)}</td>
                      <td className="num">{entry.childCount ?? '—'}</td>
                      <td>{fmtTime(entry.mtimeMs)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'sessions' && (
        <div className="hg-card">
          <h3>
            {t('section.sessions')} · {visibleSessions.length}
            {status !== null ? ` · ${t('sessions.archived')}=${status.archivedCount} · ${t('sessions.locked')}=${status.lockedCount}` : ''}
          </h3>
          <label className="hg-meta">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />{' '}
            {t('sessions.showArchived')}
          </label>
          <div className="hg-scroll">
            <table className="hg-table">
              <thead>
                <tr>
                  <th>{t('sessions.title')}</th>
                  <th>{t('sessions.project')}</th>
                  <th>{t('sessions.size')}</th>
                  <th>{t('sessions.modified')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visibleSessions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="hg-muted">{t('sessions.none')}</td>
                  </tr>
                )}
                {visibleSessions.map((row) => (
                  <tr key={row.id}>
                    <td className="hg-path">
                      {row.title ?? row.uuid}
                      {row.archived && <span className="hg-badge hg-badge-archived">{t('sessions.archived')}</span>}
                      {row.locked && <span className="hg-badge hg-badge-locked">{t('sessions.locked')}</span>}
                      {row.isCurrent && <span className="hg-badge hg-badge-current">{t('sessions.current')}</span>}
                    </td>
                    <td className="hg-path">{row.projectSlug}</td>
                    <td className="num">{fmtBytes(row.sizeBytes)}</td>
                    <td>{fmtTime(row.mtimeMs)}</td>
                    <td>
                      <div className="hg-actions">
                        {row.archived ? (
                          <button
                            type="button"
                            className="hg-btn"
                            onClick={() => void act(() => injected.unarchiveSession(row.id), `${t('sessions.unarchive')} ${row.uuid}`)}
                          >
                            {t('sessions.unarchive')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="hg-btn"
                            onClick={() => void act(() => injected.archiveSession(row.id, true), `${t('sessions.archive')} ${row.uuid}`)}
                          >
                            {t('sessions.archive')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="hg-btn hg-btn-danger"
                          disabled={row.isCurrent}
                          onClick={() => {
                            if (!window.confirm(`${t('sessions.delete')} ${row.uuid}?`)) return
                            void act(() => injected.deleteSession(row.id, true, injected.currentSessionId() ?? '', false), `${t('sessions.delete')} ${row.uuid}`)
                          }}
                        >
                          {t('sessions.delete')}
                        </button>
                        <button
                          type="button"
                          className="hg-btn hg-btn-danger"
                          disabled={row.isCurrent}
                          onClick={() => {
                            if (!window.confirm(`${t('sessions.deleteHard')} ${row.uuid}?`)) return
                            void act(() => injected.deleteSession(row.id, true, injected.currentSessionId() ?? '', true), `${t('sessions.deleteHard')} ${row.uuid}`)
                          }}
                        >
                          {t('sessions.deleteHard')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {section === 'cleanup' && status !== null && (
        <>
          <div className="hg-card">
            <h3>{t('cleanup.purgeStatus')}</h3>
            <div className="hg-meta">
              purge: {status.archivedPurge.enabled ? 'on' : 'off'} · &gt;{status.archivedPurge.olderThanDays}d ·{' '}
              {status.archivedPurge.intervalMinutes}m
              {status.archivedPurge.hardDelete ? <span className="hg-badge hg-badge-hard">hard</span> : null}
              {status.archivedPurge.lastResult !== null ? ` · ${t('common.lastRun')}: ${status.archivedPurge.lastResult}` : ''}
            </div>
            <div className="hg-actions">
              <button
                type="button"
                className="hg-btn hg-btn-danger"
                disabled={!status.writeEnabled}
                onClick={() => {
                  if (!window.confirm(t('cleanup.purge'))) return
                  void act(() => injected.purgeArchived(true, false), t('cleanup.purge'))
                }}
              >
                {t('cleanup.purge')}
              </button>
              <button
                type="button"
                className="hg-btn"
                onClick={() => void act(() => injected.purgeArchived(true, true), `${t('cleanup.purgeDry')} (${t('common.dryRun')})`)}
              >
                {t('cleanup.purgeDry')}
              </button>
            </div>
          </div>

          <div className="hg-card">
            <h3>{t('cleanup.rules')} · {status.cleanupRules.length}</h3>
            {status.cleanupRules.length === 0 ? (
              <div className="hg-muted">{t('cleanup.noRules')}</div>
            ) : (
              <table className="hg-table">
                <thead>
                  <tr>
                    <th>{t('cleanup.ruleId')}</th>
                    <th>{t('cleanup.paths')}</th>
                    <th>{t('cleanup.schedule')}</th>
                    <th>{t('cleanup.enabled')}</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {status.cleanupRules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="hg-path">{rule.id}</td>
                      <td className="hg-path">{rule.paths.join(', ')}</td>
                      <td>{fmtSchedule(rule, t)}</td>
                      <td>
                        {rule.enabled ? '✓' : '✗'}
                        {rule.hardDelete && <span className="hg-badge hg-badge-hard">{t('cleanup.hardDelete')}</span>}
                        {rule.olderThanDays !== null && <span className="hg-muted"> &gt;{rule.olderThanDays}d</span>}
                      </td>
                      <td>
                        <div className="hg-actions">
                          <button
                            type="button"
                            className="hg-btn"
                            onClick={() => void act(() => injected.runCleanup(rule.id, true, true), `${rule.id} (${t('common.dryRun')})`)}
                          >
                            {t('cleanup.runDry')}
                          </button>
                          <button
                            type="button"
                            className="hg-btn hg-btn-danger"
                            disabled={!status.writeEnabled}
                            onClick={() => {
                              if (!window.confirm(`${t('cleanup.run')} ${rule.id}?`)) return
                              void act(() => injected.runCleanup(rule.id, true, false), `${t('cleanup.run')} ${rule.id}`)
                            }}
                          >
                            {t('cleanup.run')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="hg-field" style={{ marginTop: 12 }}>
              <label htmlFor="hg-rules-json">{t('cleanup.rulesJson')}</label>
              <textarea
                id="hg-rules-json"
                className="hg-textarea"
                value={rulesJson}
                onChange={(e) => setRulesJson(e.target.value)}
              />
            </div>
            <div className="hg-actions">
              <button
                type="button"
                className="hg-btn hg-btn-danger"
                disabled={!status.writeEnabled}
                onClick={() => {
                  if (!window.confirm(t('cleanup.saveRules'))) return
                  setError(null)
                  setOk(null)
                  void injected
                    .setRules(rulesJson, true)
                    .then((result) => {
                      if (result.ok) {
                        setOk(`${t('cleanup.saveRules')}: ${result.accepted.length} ok · ${result.rejected.length} rejected`)
                        return refresh()
                      }
                      setError(result.rejected.map((r) => `${r.id}: ${r.reason}`).join('\n'))
                    })
                    .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : String(reason)))
                }}
              >
                {t('cleanup.saveRules')}
              </button>
              <button
                type="button"
                className="hg-btn"
                disabled={!status.writeEnabled}
                onClick={() => {
                  if (!window.confirm(`${t('cleanup.run')} all?`)) return
                  void act(() => injected.runCleanup('all', true, false), `${t('cleanup.run')} all`)
                }}
              >
                {t('cleanup.run')} all
              </button>
            </div>
          </div>

          <div className="hg-card">
            <h3>{t('section.audit')}</h3>
            {status.auditTail.length === 0 ? (
              <div className="hg-muted">{t('audit.none')}</div>
            ) : (
              <div className="hg-scroll">
                <table className="hg-table">
                  <thead>
                    <tr>
                      <th>{t('audit.ts')}</th>
                      <th>{t('audit.kind')}</th>
                      <th>{t('audit.outcome')}</th>
                      <th>{t('audit.path')}</th>
                      <th>{t('audit.detail')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {status.auditTail.map((rec, idx) => (
                      <tr key={`${rec.ts}-${idx}`}>
                        <td>{rec.ts}</td>
                        <td>{rec.kind}</td>
                        <td>{rec.outcome}{rec.deleted > 0 ? ` · ${rec.deleted}` : ''}</td>
                        <td className="hg-path">{rec.path ?? rec.sessionId ?? rec.ruleId ?? '—'}</td>
                        <td>{rec.detail ?? ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {status !== null && status.lastTickError !== null && (
        <div className="hg-card">
          <div className="hg-error">{t('common.lastTickError')}: {status.lastTickError}</div>
        </div>
      )}
    </div>
  )
}

export default HomeGuardTab
