/**
 * Minimal glob matching for cleanup rules: `*` (no separators), `**`
 * (any depth), `?` (one non-separator char). Patterns are relative to the
 * home root and always use forward slashes.
 *
 * @module dsh-home-guard/glob
 */

import { normalizeRel } from './paths.ts'

/**
 * Compile a glob into an anchored regular expression.
 *
 * @param pattern - glob with `*`, `**`, `?` segments.
 */
export function globToRegExp(pattern: string): RegExp {
  const rel = normalizeRel(pattern)
  let out = ''
  for (let i = 0; i < rel.length; i += 1) {
    const ch = rel[i] ?? ''
    if (ch === '*') {
      if (rel[i + 1] === '*') {
        // `**/` swallows the separator; bare `**` matches anything.
        if (rel[i + 2] === '/') {
          out += '(?:.*/)?'
          i += 2
        } else {
          out += '.*'
          i += 1
        }
      } else {
        out += '[^/]*'
      }
    } else if (ch === '?') {
      out += '[^/]'
    } else if ('\\^$.|+()[]{}'.includes(ch)) {
      out += `\\${ch}`
    } else {
      out += ch
    }
  }
  return new RegExp(`^${out}$`)
}

/**
 * Does a home-relative path match a glob pattern?
 *
 * @param relPath - path relative to the home root (forward slashes).
 * @param pattern - glob pattern relative to the home root.
 */
export function matchGlob(relPath: string, pattern: string): boolean {
  const rel = normalizeRel(relPath)
  const pat = normalizeRel(pattern)
  if (pat.includes('**')) return globToRegExp(pat).test(rel)
  // Fast path: plain string or single-star glob.
  if (!pat.includes('*') && !pat.includes('?')) return rel === pat
  return globToRegExp(pat).test(rel)
}

/**
 * Does a path match ANY of the patterns?
 *
 * @param relPath - home-relative path.
 * @param patterns - candidate globs.
 */
export function matchAnyGlob(relPath: string, patterns: readonly string[]): boolean {
  return patterns.some((p) => matchGlob(relPath, p))
}
