import { getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

// The idiom, matched in one pass: a subject's first character upper-cased, joined to that same subject's tail.
// `\s*` sits at every joint rather than a condensed window being read, because the expression has no
// fixed-width span to bound and a formatter may wrap it at any of them.
//
// The backreference is what makes the match a capitalize rather than two unrelated halves, and the leading
// lookbehind keeps the subject from starting mid-identifier, which would let `sX...+ X.slice(1)` match on `X`.
// The trailing lookahead declines a tail that the source goes on to transform: the chained call reaches the tail
// alone, which `capitalize` does not reproduce, whether it re-cases the tail or does anything else to it. A
// call on the whole expression sits outside the match and is claimed.
const CAPITALIZE_INLINE =
  /(?<![\w$.])(?<subject>[\w$]+(?:\.[\w$]+)*)\s*(?:\.charAt\(\s*0\s*\)|\[\s*0\s*\])\s*\.toUpperCase\(\)\s*(?:\+|\}\$\{)\s*\k<subject>\s*\.(?:slice|substring)\(\s*1\s*\)(?!\s*\.)/g;

/**
 * Lists the line of every hand-rolled capitalization in a source file.
 *
 * Takes the blanked code `listStringIdioms` produces, so a capitalization written in a comment or a literal is
 * not one.
 *
 * Both first-character forms count, `charAt(0)` and `[0]`, as do both tails, `slice(1)` and `substring(1)`,
 * and both joins, `+` concatenation and adjacent template substitutions.
 *
 * @internal
 */
export function listCapitalizeLines(source: string): number[] {
  return source
    .matchAll(CAPITALIZE_INLINE)
    .map((match) => getLineAtOffset(source, match.index))
    .toArray();
}
