/**
 * `dsh-home-guard`, browser half: mounts the `homeGuard` Remote contribution,
 * then registers the Home Guard tab into the Plugins settings section
 * (`settings.plugins.tab`, id `home-guard`). All data arrives through the
 * `remote.homeGuard` namespace; the current session id (for approval
 * routing) is read from the sessions store at call time.
 *
 * Client Context typing uses local structural contracts (`./contract.ts`,
 * R5) — the npm `@deepseek-ai/dsh-client-*` packages are stale, and the DSH
 * loader supplies every runtime value from the core tree.
 *
 * @module dsh-home-guard/client
 */

import type { RemoteResult } from '@deepseek-ai/dsh-typert-protocol'
import { HomeGuardTab, type HomeGuardTabInjected } from './HomeGuardTab.tsx'
import type { ClientContextLike, ClientScopeLike } from './contract.ts'
import { en, zh, type HomeGuardLocaleKey } from './locales.ts'
import { HOME_GUARD_REMOTE } from './remote.ts'
import { installHomeGuardStyles } from './styles.ts'
import type {
  AuditTailWire,
  HomeGuardStatusWire,
  OpResultWire,
  SessionListWire,
  SetRulesResultWire,
} from '../wire.ts'

/** Dictionary namespace owned by this plugin. */
export const NS = 'settings.homeGuard'

/** Plugin name: matches the package name, the graph row id, and the bundle id. */
export const name = 'dsh-home-guard'

/** Services the console reads; `remote.homeGuard` appears once this plugin mounts its contribution. */
export const inject = ['slots', 'locale', 'remote', 'sessions']

/**
 * Unwrap a `RemoteResult` (possibly still a promise from the remote bag) or
 * throw the remote's error code + message.
 *
 * @param result - remote result envelope, or a promise of one.
 * @param method - method name for the error message.
 */
async function unwrap<T>(result: Promise<RemoteResult<T>> | RemoteResult<T>, method: string): Promise<T> {
  const envelope = await result
  if (envelope !== null && typeof envelope === 'object' && 'ok' in envelope) {
    const box = envelope as { ok?: boolean; value?: T; code?: string; message?: string }
    if (box.ok === true) return box.value as T
    throw new Error(`remote.homeGuard.${method} failed: ${box.code ?? 'unknown'}: ${box.message ?? ''}`)
  }
  return envelope as T
}

/** Structural face of the mounted `remote.homeGuard` namespace. */
interface HomeGuardRemoteBag {
  status(): Promise<RemoteResult<HomeGuardStatusWire>>
  listSessions(includeArchived: boolean): Promise<RemoteResult<SessionListWire>>
  archiveSession(id: string, confirmed: boolean): Promise<RemoteResult<OpResultWire>>
  unarchiveSession(id: string): Promise<RemoteResult<OpResultWire>>
  deleteSession(id: string, confirmed: boolean, currentSessionId: string, hardDelete: boolean): Promise<RemoteResult<OpResultWire>>
  purgeArchived(confirmed: boolean, dryRun: boolean): Promise<RemoteResult<OpResultWire>>
  runCleanup(ruleId: string, confirmed: boolean, dryRun: boolean): Promise<RemoteResult<OpResultWire>>
  setRules(rulesJson: string, confirmed: boolean): Promise<RemoteResult<SetRulesResultWire>>
  getAudit(limit: number): Promise<RemoteResult<AuditTailWire>>
}

/**
 * Read the current session id from the sessions store (best effort): the
 * store's `current` field, else the `byId` entry retained by the main view.
 *
 * @param sessions - sessions store face (structural).
 */
function currentSessionId(sessions: unknown): string | null {
  const store = sessions as {
    list?: { getSnapshot?: () => { current?: unknown; byId?: Record<string, { retainedBy?: { mainView?: number } } | undefined> } }
  }
  const snapshot = store.list?.getSnapshot?.()
  if (snapshot === undefined) return null
  if (typeof snapshot.current === 'string' && snapshot.current !== '') return snapshot.current
  const byId = snapshot.byId
  if (byId !== undefined && byId !== null) {
    for (const [id, entry] of Object.entries(byId)) {
      if ((entry?.retainedBy?.mainView ?? 0) > 0) return id
    }
  }
  return null
}

/**
 * Browser body: locale registration, stylesheet, Remote contribution mount,
 * and the settings tab registration. Every step is guarded — one failure
 * must never take the whole web boot down (the rc.2 boot aborts the shell
 * when a single entry's `apply` throws).
 *
 * @param ctx - client cordis context (structural face).
 */
export async function apply(ctx: ClientContextLike): Promise<void> {
  // rc.2 locale service: `register(ns, { en: {...}, zh: {...} })` — a
  // non-string second arg is parsed as per-locale dicts; a flat merged dict
  // makes it validate locale ids against the keys and throw.
  try {
    ctx.locale.register(NS, { en, zh })
  } catch {
    // duplicate registration on HMR re-apply is fine
  }
  try {
    installHomeGuardStyles()
  } catch {
    // stylesheet is cosmetic
  }
  // $mount registers the 'remote.homeGuard' namespace service and owns its
  // disposal through the plugin scope. Cost-meter pattern: bail out cleanly
  // when the remote face is absent instead of throwing.
  if (ctx.remote != null && typeof ctx.remote.$mount === 'function') {
    try {
      await ctx.remote.$mount(HOME_GUARD_REMOTE)
    } catch {
      // tab renders with an error state; boot stays alive
    }
  }
  if (typeof ctx.inject !== 'function') return
  ctx.inject(['remote.homeGuard', 'slots', 'locale', 'sessions'], (scope: ClientScopeLike) => {
    const makeInjected = (): HomeGuardTabInjected => {
      const remote = scope.get('remote.homeGuard') as HomeGuardRemoteBag
      const locale = scope.get('locale') as { t: (ns: string, key: string) => string }
      return {
        status: () => unwrap(remote.status(), 'status'),
        listSessions: (includeArchived: boolean) => unwrap(remote.listSessions(includeArchived), 'listSessions'),
        archiveSession: (id: string, confirmed: boolean) => unwrap(remote.archiveSession(id, confirmed), 'archiveSession'),
        unarchiveSession: (id: string) => unwrap(remote.unarchiveSession(id), 'unarchiveSession'),
        deleteSession: (id: string, confirmed: boolean, currentId: string, hardDelete: boolean) =>
          unwrap(remote.deleteSession(id, confirmed, currentId, hardDelete), 'deleteSession'),
        purgeArchived: (confirmed: boolean, dryRun: boolean) => unwrap(remote.purgeArchived(confirmed, dryRun), 'purgeArchived'),
        runCleanup: (ruleId: string, confirmed: boolean, dryRun: boolean) =>
          unwrap(remote.runCleanup(ruleId, confirmed, dryRun), 'runCleanup'),
        setRules: (rulesJson: string, confirmed: boolean) => unwrap(remote.setRules(rulesJson, confirmed), 'setRules'),
        getAudit: (limit: number) => unwrap(remote.getAudit(limit), 'getAudit'),
        t: (key: HomeGuardLocaleKey) => {
          try {
            const value = locale.t(NS, key)
            return typeof value === 'string' && value !== '' ? value : key
          } catch {
            return key
          }
        },
        currentSessionId: () => currentSessionId(scope.get('sessions')),
      }
    }
    const slots = scope.get('slots') as {
      inject(slot: string, callback: () => unknown): void
      register(options: {
        name: 'settings.plugins.tab'
        id: string
        order: number
        label: () => string
        locale: string
        inject: () => HomeGuardTabInjected
      }, component: unknown): () => void
    }
    slots.inject('settings.plugins.tab', () =>
      slots.register(
        {
          name: 'settings.plugins.tab',
          id: 'home-guard',
          order: 40,
          label: () => 'Home Guard',
          locale: NS,
          inject: () => makeInjected(),
        },
        HomeGuardTab,
      ),
    )
  })
}

export default apply
