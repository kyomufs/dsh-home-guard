import { describe, expect, it } from 'vitest'
import {
  DEFAULT_TICK_MS,
  isValidSessionId,
  normalizeRule,
  resolveConfig,
  resolveRules,
  sessionIdOf,
  sessionUuidOf,
  validateRule,
} from '../src/config'

describe('resolveConfig', () => {
  it('applies defaults for empty input', () => {
    const cfg = resolveConfig(undefined)
    expect(cfg.tickMs).toBe(DEFAULT_TICK_MS)
    expect(cfg.writeEnabled).toBe(true)
    expect(cfg.confirmRequired).toBe(true)
    expect(cfg.archivedPurge.enabled).toBe(false)
    expect(cfg.archivedPurge.olderThanDays).toBe(30)
    expect(cfg.archivedPurge.intervalMinutes).toBe(60)
    expect(cfg.cleanupRules).toEqual([])
    expect(cfg.trashRetentionDays).toBe(7)
  })

  it('rejects tickMs below minimum', () => {
    expect(() => resolveConfig({ tickMs: 1000 })).toThrow(/tickMs/)
  })

  it('rejects archivedPurge.olderThanDays < 1', () => {
    expect(() => resolveConfig({ archivedPurge: { enabled: true, olderThanDays: 0 } })).toThrow(/olderThanDays/)
  })

  it('rejects invalid cleanup rules', () => {
    expect(() =>
      resolveConfig({ cleanupRules: [{ id: 'bad id!', paths: ['x'], schedule: { kind: 'interval', hours: 1 } }] as never }),
    ).toThrow(/cleanupRules rejected/)
  })

  it('trims homeDir', () => {
    const cfg = resolveConfig({ homeDir: '  /tmp/x  ' })
    expect(cfg.homeDir).toBe('/tmp/x')
  })
})

describe('validateRule', () => {
  it('accepts a valid daily rule', () => {
    const err = validateRule({ id: 'logs-old', paths: ['logs/**/*.log'], schedule: { kind: 'daily', at: '04:30' } })
    expect(err).toBeNull()
  })

  it('rejects bad schedule kind', () => {
    expect(validateRule({ id: 'x', paths: ['a'], schedule: { kind: 'weekly' } })).toMatch(/kind/)
  })

  it('rejects bad daily time', () => {
    expect(validateRule({ id: 'x', paths: ['a'], schedule: { kind: 'daily', at: '25:00' } })).toMatch(/HH:MM/)
  })

  it('rejects empty paths', () => {
    expect(validateRule({ id: 'x', paths: [], schedule: { kind: 'interval', hours: 1 } })).toMatch(/paths/)
  })
})

describe('normalizeRule', () => {
  it('defaults enabled/hardDelete/olderThanDays and trims paths', () => {
    const rule = { id: 'r', paths: [' a ', 'b'], schedule: { kind: 'interval', hours: 2 } } as Record<string, unknown>
    const out = normalizeRule(rule)
    expect(out.enabled).toBe(true)
    expect(out.hardDelete).toBe(false)
    expect(out.olderThanDays).toBeNull()
    expect(out.paths).toEqual(['a', 'b'])
    expect(out.schedule).toEqual({ kind: 'interval', hours: 2 })
  })
})

describe('resolveRules', () => {
  it('partial-accepts with per-entry reasons', () => {
    const { accepted, rejected } = resolveRules([
      { id: 'good', paths: ['logs/**'], schedule: { kind: 'interval', hours: 24 } },
      { id: 'bad', paths: [], schedule: { kind: 'interval', hours: 24 } },
    ])
    expect(accepted).toHaveLength(1)
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.id).toBe('bad')
  })

  it('rejects non-array input', () => {
    const { accepted, rejected } = resolveRules('nope' as never)
    expect(accepted).toHaveLength(0)
    expect(rejected[0]?.reason).toMatch(/array/)
  })
})

describe('session id helpers', () => {
  it('validates registry and bare uuids', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    expect(isValidSessionId(uuid)).toBe(true)
    expect(isValidSessionId(`session-${uuid}`)).toBe(true)
    expect(isValidSessionId('session-nope')).toBe(false)
    expect(isValidSessionId('')).toBe(false)
    expect(isValidSessionId(42 as never)).toBe(false)
  })

  it('strips/adds prefix symmetrically', () => {
    const uuid = '123e4567-e89b-12d3-a456-426614174000'
    expect(sessionUuidOf(`session-${uuid}`)).toBe(uuid)
    expect(sessionUuidOf(uuid)).toBe(uuid)
    expect(sessionIdOf(uuid)).toBe(`session-${uuid}`)
    expect(sessionIdOf(`session-${uuid}`)).toBe(`session-${uuid}`)
  })
})
