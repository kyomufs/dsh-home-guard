import { describe, expect, it } from 'vitest'
import { HOME_GUARD_INVOCATIONS } from '../src/wire'

describe('wire descriptors', () => {
  it('exports exactly ten frozen invocations', () => {
    expect(HOME_GUARD_INVOCATIONS).toHaveLength(10)
    expect(Object.isFrozen(HOME_GUARD_INVOCATIONS)).toBe(true)
  })

  it('ids use the pkg#namespace/method shape', () => {
    for (const d of HOME_GUARD_INVOCATIONS) {
      expect(d.id).toMatch(/^dsh-home-guard#homeGuard\//)
      expect(d.service).toBe('homeGuard')
      expect(d.namespace).toBe('homeGuard')
      expect(d.invocation.kind).toBe('direct')
      expect(typeof d.method).toBe('string')
      expect(d.sourceLocation?.file).toBe('src/wire.ts')
    }
  })

  it('covers the ten public methods', () => {
    const methods = HOME_GUARD_INVOCATIONS.map((d) => d.method).sort()
    expect(methods).toEqual(
      [
        'archiveSession',
        'deleteSession',
        'getAudit',
        'listSessions',
        'purgeArchived',
        'runCleanup',
        'runTick',
        'setRules',
        'status',
        'unarchiveSession',
      ].sort(),
    )
  })

  it('every descriptor has a strict result codec', () => {
    for (const d of HOME_GUARD_INVOCATIONS) {
      const result = d.result as { mode?: string; typeSymbol?: string; create?: () => unknown }
      expect(result.mode).toBe('strict')
      expect(typeof result.create).toBe('function')
      expect(result.create?.()).toBeDefined()
    }
  })
})
