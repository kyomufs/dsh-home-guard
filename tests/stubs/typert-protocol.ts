/**
 * Runtime stub for `@deepseek-ai/dsh-typert-protocol` in vitest (node env).
 * Tests only exercise plugin-own code paths; the real package is loader-
 * supplied at runtime and npm-supplied at typecheck time.
 */

/** Local RemoteResult envelope shape (structural, mirrors rc.2). */
export type RemoteResult<T> =
  | { ok: true; value?: T }
  | { ok: false; code?: string; message?: string }

/** Invocation descriptor structural shape used by the plugin. */
export interface InvocationDescriptor {
  id: string
  service: string
  namespace: string
  method: string
  invocation: { kind: 'direct' }
  parameters: unknown[]
  result: unknown
  sourceLocation?: { file?: string }
}

/** Minimal TypertRemoteService base: stores ctx for subclass access. */
export abstract class TypertRemoteService<T = never> {
  readonly ctx: unknown
  protected readonly serviceKey: string
  constructor(ctx: unknown, serviceKey: string, _options?: unknown) {
    this.ctx = ctx
    this.serviceKey = serviceKey
  }
}

/** TypertRemoteContribution structural shape. */
export interface TypertRemoteContribution {
  package: string
  descriptors: readonly InvocationDescriptor[]
}
