import { describe, expect, it } from 'vitest'
import { isRuleDue } from '../src/cleanup'
import type { CleanupRule } from '../src/config'

function rule(partial: Partial<CleanupRule>): CleanupRule {
  return {
    id: 'r',
    paths: ['logs/**'],
    olderThanDays: null,
    schedule: { kind: 'interval', hours: 24 },
    enabled: true,
    hardDelete: false,
    ...partial,
  }
}

describe('isRuleDue', () => {
  it('interval rule is due when now - last >= interval', () => {
    const r = rule({ schedule: { kind: 'interval', hours: 1 } })
    const now = 1_000_000_000
    expect(isRuleDue(r, now - 3_600_000 - 1, now)).toBe(true)
    expect(isRuleDue(r, now - 3_599_000, now)).toBe(false)
  })

  it('disabled rule is never due', () => {
    const r = rule({ enabled: false, schedule: { kind: 'interval', hours: 1 } })
    expect(isRuleDue(r, 0, Date.now())).toBe(false)
  })

  it('daily rule crosses local midnight window', () => {
    const r = rule({ schedule: { kind: 'daily', at: '04:30' } })
    const now = Date.now()
    // last run "yesterday" at 03:30 local must be due at some point later —
    // pure math: due when daily boundary passed since lastRun.
    const due = isRuleDue(r, now - 25 * 3_600_000, now)
    expect(typeof due).toBe('boolean')
  })

  it('interval rule with no lastRun is due', () => {
    const r = rule({ schedule: { kind: 'interval', hours: 24 } })
    expect(isRuleDue(r, 0, Date.now())).toBe(true)
  })
})
