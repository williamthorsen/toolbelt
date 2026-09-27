import { arraify } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Checks a target string against one or more string or RegExp patterns.
 * Returns true if a non-empty target exactly matches a string pattern, matches a RegExp pattern, or satisfies a
 * predicate pattern, else false.
 * @category String
 * @experimental
 * @stage candidate
 */
export function isPatternMatch(pattern: Patterns, target: string): boolean {
  if (!target) return false;

  return arraify(pattern).some((p) => {
    if (typeof p === 'string') return target === p;
    if (typeof p === 'function') return p(target);
    return p.test(target);
  });
}

type Pattern = string | RegExp | ((input: string) => boolean);
type Patterns = Pattern | ReadonlyArray<Pattern>;
