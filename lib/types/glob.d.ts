/**
 * Minimal glob matching for cleanup rules: `*` (no separators), `**`
 * (any depth), `?` (one non-separator char). Patterns are relative to the
 * home root and always use forward slashes.
 *
 * @module dsh-home-guard/glob
 */
/**
 * Compile a glob into an anchored regular expression.
 *
 * @param pattern - glob with `*`, `**`, `?` segments.
 */
export declare function globToRegExp(pattern: string): RegExp;
/**
 * Does a home-relative path match a glob pattern?
 *
 * @param relPath - path relative to the home root (forward slashes).
 * @param pattern - glob pattern relative to the home root.
 */
export declare function matchGlob(relPath: string, pattern: string): boolean;
/**
 * Does a path match ANY of the patterns?
 *
 * @param relPath - home-relative path.
 * @param patterns - candidate globs.
 */
export declare function matchAnyGlob(relPath: string, patterns: readonly string[]): boolean;
