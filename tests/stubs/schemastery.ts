/**
 * Minimal stand-in for `@deepseek-ai/schemastery` used only under vitest
 * (see vitest.config.ts alias). It records nothing: every builder call and
 * every chained schema method returns another inert Schema so that module
 * init (`z.object({...}).default(...)`) succeeds. `resolveConfig` re-validates
 * everything itself, so schema parse behavior is never exercised here.
 */

/** Schemastery Schema stand-in: every method returns another inert schema. */
export interface Schema {
  [key: string]: unknown
}

function make(): Schema {
  const fn = (): Schema => make()
  return new Proxy(fn as unknown as Schema, {
    get(target, prop): unknown {
      if (typeof prop === 'symbol') {
        return (target as Record<symbol, unknown>)[prop]
      }
      // `then` must stay undefined so the proxy is never treated as thenable.
      if (prop === 'then') return undefined
      // Every schemastery builder/method call (z.string, .default, .step,
      // .min, .int, z.any, z.object, ...) returns another inert schema.
      return () => make()
    },
    apply(): Schema {
      return make()
    },
  })
}

export const z: Schema = make()
export default z
