import { describe, expect, it } from 'vitest'
import { globToRegExp, matchAnyGlob, matchGlob } from '../src/glob'

describe('globToRegExp', () => {
  it('treats * as any chars except slash', () => {
    const re = globToRegExp('logs/*.log')
    expect(re.test('logs/a.log')).toBe(true)
    expect(re.test('logs/a/b.log')).toBe(false)
  })

  it('treats ** as any depth', () => {
    const re = globToRegExp('logs/**/*.log')
    expect(re.test('logs/a.log')).toBe(true)
    expect(re.test('logs/x/y/z/a.log')).toBe(true)
    expect(re.test('other/a.log')).toBe(false)
  })

  it('treats a bare * as all', () => {
    const re = globToRegExp('*')
    expect(re.test('anything')).toBe(true)
  })

  it('escapes regex specials', () => {
    const re = globToRegExp('a.b(c)')
    expect(re.test('a.b(c)')).toBe(true)
    expect(re.test('axbx(c)')).toBe(false)
  })

  it('supports ?', () => {
    const re = globToRegExp('?.log')
    expect(re.test('a.log')).toBe(true)
    expect(re.test('ab.log')).toBe(false)
  })
})

describe('matchGlob / matchAnyGlob', () => {
  it('matches and rejects', () => {
    expect(matchGlob('session_projcache.json', 'session_projcache*')).toBe(true)
    expect(matchGlob('nested/session_projcache.json', 'session_projcache*')).toBe(false)
    expect(matchAnyGlob('logs/deep/f.log', ['logs/**'])).toBe(true)
    expect(matchAnyGlob('other/f.log', ['logs/**'])).toBe(false)
    expect(matchAnyGlob('anything', [])).toBe(false)
  })
})
