import { describe, expect, it } from 'vitest'
import { homePaths, isInside, isProtected, normalizeRel, safeJoin } from '../src/paths'

const root = '/home/u/.dsh'

describe('homePaths', () => {
  it('derives unit + trash paths', () => {
    const p = homePaths(root)
    expect(p.root).toBe(root)
    expect(p.sessions).toBe(`${root}/sessions`)
    expect(p.unitDir).toBe(`${root}/storages/dsh-home-guard`)
    expect(p.rulesFile).toBe(`${root}/storages/dsh-home-guard/rules.json`)
    expect(p.auditFile).toBe(`${root}/storages/dsh-home-guard/audit.log`)
    expect(p.trash).toBe(`${root}/trash/dsh-home-guard`)
  })
})

describe('isProtected', () => {
  it('protects core dirs and files', () => {
    expect(isProtected('sessions', root)).toBe(true)
    expect(isProtected('attachments', root)).toBe(true)
    expect(isProtected('.credentials.yaml', root)).toBe(true)
    expect(isProtected('profiles', root)).toBe(true)
    expect(isProtected('skills', root)).toBe(true)
    expect(isProtected('AGENTS.md', root)).toBe(true)
    expect(isProtected('.git', root)).toBe(true)
    expect(isProtected('dsh-usage', root)).toBe(true)
    expect(isProtected('state', root)).toBe(true)
  })

  it('protects foreign storages but not plugin unit', () => {
    expect(isProtected('storages/cost-meter', root)).toBe(true)
    expect(isProtected('storages/session_projcache.json', root)).toBe(true)
    expect(isProtected('storages/dsh-home-guard', root)).toBe(false)
  })

  it('allows logs and trash', () => {
    expect(isProtected('logs', root)).toBe(false)
    expect(isProtected('trash/dsh-home-guard', root)).toBe(false)
  })
})

describe('normalizeRel', () => {
  it('strips leading slash and dot segments', () => {
    expect(normalizeRel('/logs/a.log')).toBe('logs/a.log')
    expect(normalizeRel('./logs//a.log')).toBe('logs/a.log')
  })

  it('rejects escaping rels', () => {
    // Normalization must NOT silently drop `..`: the gates (safeJoin → null,
    // checkRulePatterns → per-entry reason) are what reject escapes.
    expect(normalizeRel('../x')).toBe('../x')
  })
})

describe('safeJoin', () => {
  it('joins inside root', () => {
    expect(safeJoin(root, 'logs/a.log')).toBe(`${root}/logs/a.log`)
  })

  it('rejects escape attempts', () => {
    expect(safeJoin(root, '../outside')).toBeNull()
  })
})

describe('isInside', () => {
  it('is boundary-aware', () => {
    expect(isInside(`${root}/logs`, `${root}/logs/a.log`)).toBe(true)
    expect(isInside(`${root}/logs`, `${root}/logsX/a.log`)).toBe(false)
    expect(isInside(`${root}/logs`, `${root}/other`)).toBe(false)
  })
})
