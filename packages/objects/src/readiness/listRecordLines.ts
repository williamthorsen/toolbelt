import { getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

const OBJECT_TAG = 'object';
const SUBJECT = String.raw`[\w$]+(?:\.[\w$]+)*`;
// A quoted literal of any content: blanking replaces a literal's characters with spaces, so what it holds is
// read from the unblanked source instead.
const QUOTED = String.raw`(?<literal>(?<quote>['"])[^'"\n]*\k<quote>)`;
// The array exclusion the shorter form omits, then the guard that ends the claim where the conjunction does.
// Both lengths are tried, and a further operand fails the lookahead at each, so a site continuing into a
// property probe goes unclaimed.
const TAIL = String.raw`(?:\s*&&\s*!\s*Array\s*\.\s*isArray\s*\(\s*\k<subject>\s*\))?(?!\s*&&)`;
// `\s*` sits at every joint, so a conjunction a formatter wrapped reads the same as one left on a line.
const TYPEOF_FIRST = new RegExp(
  String.raw`(?<![\w$.])typeof\s+(?<subject>${SUBJECT})\s*===\s*${QUOTED}\s*&&\s*\k<subject>\s*!==?\s*null${TAIL}`,
  'dg',
);
const NULL_FIRST = new RegExp(
  String.raw`(?<![\w$.])(?<subject>${SUBJECT})\s*!==?\s*null\s*&&\s*typeof\s+\k<subject>\s*===\s*${QUOTED}${TAIL}`,
  'dg',
);

/**
 * Lists the line of every hand-rolled record guard in a source file.
 *
 * Takes both texts. The conjunction is matched on the blanked code, so a guard written in a comment is not
 * one, and the compared literal is then read from the unblanked source at the offset the match reports:
 * blanking replaces a literal's characters with spaces in place, so the two texts stay aligned while only the
 * unblanked one still says what the literal holds.
 *
 * Both operand orders count, and both lengths: the conjunction alone, which `isRecordOrArray` replaces, and
 * the same conjunction closing with the array exclusion, which `isRecord` replaces. A conjunction carrying a
 * further operand is declined, since adoption there is a rewrite rather than a substitution.
 *
 * @internal
 */
export function listRecordLines(code: string, source: string): number[] {
  const lines = [TYPEOF_FIRST, NULL_FIRST].flatMap((pattern) => listLinesMatching(pattern, code, source));

  return [...new Set(lines)].toSorted((a, b) => a - b);
}

// region | Helpers

/** Lists the line of every match whose compared literal reads as the object tag in the unblanked source. */
function listLinesMatching(pattern: RegExp, code: string, source: string): number[] {
  return code
    .matchAll(pattern)
    .filter((match) => readLiteral(source, match.indices?.groups?.['literal']) === OBJECT_TAG)
    .map((match) => getLineAtOffset(code, match.index))
    .toArray();
}

/** Reads a matched literal's text from the unblanked source, dropping the quotes the span includes. */
function readLiteral(source: string, span: readonly number[] | undefined): string | undefined {
  const start = span?.[0];
  const end = span?.[1];

  return start === undefined || end === undefined ? undefined : source.slice(start + 1, end - 1);
}

// endregion | Helpers
