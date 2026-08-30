import { getLineAtOffset, readLiteral } from '@williamthorsen/toolbelt.adoption';

const QUOTED = '\'[^\']*\'|"[^"]*"';
// The ternary, anchored on its comparison against 1. `\)*` covers a parenthesized condition; a condition
// carrying anything else between the comparison and the `?`, such as a second operand, goes unmatched.
const PLURALIZE_TERNARY = new RegExp(
  String.raw`(?<op>===|!==)\s*1\s*\)*\s*\?\s*(?<first>${QUOTED})\s*:\s*(?<second>${QUOTED})`,
  'dg',
);

/**
 * Lists the line of every hand-rolled pluralization in a source file.
 *
 * Takes both texts. The ternary is matched on the blanked code, so a pluralization written in a comment is not
 * one, and the two literals are then read from the unblanked source at the offsets that match reports:
 * blanking replaces a literal's characters with spaces in place, so the two texts stay aligned while only the
 * unblanked one still says what the literals hold.
 *
 * A site is a pluralization where the plural is the singular plus `s`, which covers `'x' : 'xs'`, `'' : 's'`,
 * and the `!==` mirror `'s' : ''`. A pair of identifiers is not matched and a pair of unrelated literals is
 * declined: that relation is the only evidence available that the compared value is a count rather than any
 * other value a source compares against 1.
 *
 * @internal
 */
export function listPluralizeLines(code: string, source: string): number[] {
  const lines: number[] = [];

  for (const match of code.matchAll(PLURALIZE_TERNARY)) {
    const first = readLiteral(source, match.indices?.groups?.['first']);
    const second = readLiteral(source, match.indices?.groups?.['second']);
    if (first === undefined || second === undefined) continue;

    const takesSingularFirst = match.groups?.['op'] === '===';
    const singular = takesSingularFirst ? first : second;
    const plural = takesSingularFirst ? second : first;
    if (plural !== `${singular}s`) continue;

    lines.push(getLineAtOffset(code, match.index));
  }

  return lines;
}
