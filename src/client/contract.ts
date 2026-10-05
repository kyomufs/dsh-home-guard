/**
 * Local structural contracts for the browser shell Context (R5): the npm
 * `@deepseek-ai/dsh-client-*` packages are stale/unpublished, so the client
 * face types against these structural shapes instead. The runtime values are
 * provided by the DSH loader (see `dsh.client.inject` in package.json).
 *
 * @module dsh-home-guard/client/contract
 */

import type { RemoteResult, TypertRemoteContribution } from '@deepseek-ai/dsh-typert-protocol'

/** Locale service face (structural): rc.2 `register(ns, { locale: dict })`. */
export interface LocaleLike {
  register(ns: string, dicts: Record<string, Record<string, string>>): unknown
  t(ns: string, key: string): string
}

/** Remote service face (structural): `$mount` + namespaced method bags. */
export interface RemoteLike {
  $mount(contribution: TypertRemoteContribution): Promise<unknown>
  [namespace: string]: unknown
}

/** Settings-tab slots face (structural): `settings.plugins.tab` registration. */
export interface SlotsLike {
  inject(slot: string, callback: () => unknown): void
  register(options: Record<string, unknown>, component: unknown): () => void
}

/** Client Context face (structural): cordis + dsh client services merged. */
export interface ClientContextLike {
  locale: LocaleLike
  remote: RemoteLike
  inject(services: string[], callback: (scope: ClientScopeLike) => unknown): void
  [key: string]: unknown
}

/** Injected scope face (structural): service getters + service properties. */
export interface ClientScopeLike {
  get(service: string): unknown
  [key: string]: unknown
}

/** Re-export for consumers that wrap remote calls. */
export type { RemoteResult, TypertRemoteContribution }
