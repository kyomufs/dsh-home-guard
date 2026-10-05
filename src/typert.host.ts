/**
 * Frozen Typert manifest for the `dsh-home-guard` host contribution.
 * Shape matches the working `dsh-cost-meter` manifest (package/face/schemas/
 * invocations/model); the loader reads this from the `./typert` subpath export.
 *
 * @module dsh-home-guard/typert.host
 */

import { HOME_GUARD_INVOCATIONS } from './wire.ts'

/** Package identity shared across the manifest and descriptors. */
const PKG = 'dsh-home-guard'

/**
 * TYPERT manifest: face `host`, all `homeGuard` invocations, empty schema
 * model (the namespace is invocation-only — same shape cost-meter ships).
 */
export const TYPERT = {
  package: PKG,
  face: 'host' as const,
  schemas: [],
  invocations: HOME_GUARD_INVOCATIONS,
  model: {
    services: [],
    events: [],
    objects: [],
  },
}

export default TYPERT
