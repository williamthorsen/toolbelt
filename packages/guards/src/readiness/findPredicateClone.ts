import { readLiteral } from '@williamthorsen/toolbelt.adoption';

import { isNonNullableTest, isNullishTest } from './nullish-tests.ts';

export type PredicateCloneKind =
  'boolean-clone' | 'non-nullable-clone' | 'nullish-clone' | 'number-clone' | 'string-clone';

// One `return` of one expression and nothing else: a second statement or a nested block fails the class, which
// is what holds the finding to a function the import retires outright.
const RETURNED_EXPRESSION = /^\{\s*return\s+(?<expression>[^;{}]+?)\s*;?\s*\}$/;
// The NaN exclusion is optional because `isNumber` performs it and a hand-roll often does not; the tail is
// tolerated so both forms report, and the fix text carries the difference. A yoda comparison is not matched:
// the tag reads on the right in every form this repository and its lint configuration admit.
const TYPEOF_BODY =
  /^\{\s*return\s+typeof\s+(?<subject>[\w$]+)\s*===\s*(?<literal>(?<quote>['"])[^'"\n]*\k<quote>)(?:\s*&&\s*!\s*Number\s*\.\s*isNaN\s*\(\s*\k<subject>\s*\))?\s*;?\s*\}$/d;
const TAG_KINDS = new Map<string, PredicateCloneKind>([
  ['boolean', 'boolean-clone'],
  ['number', 'number-clone'],
  ['string', 'string-clone'],
]);

/**
 * Returns the guard a function's body returns outright, or nothing where the body returns anything else.
 *
 * Takes the blanked body, the unblanked source, and the body's offset within it: A `typeof` comparison names
 * its tag in a literal, whose characters blanking replaces with spaces, so the tag is read from the source
 * beneath at the span that the match reports.
 *
 * @internal
 */
export function findPredicateClone(
  body: string,
  source: string,
  bodyStart: number,
  parameter: string,
): PredicateCloneKind | undefined {
  const typeofMatch = TYPEOF_BODY.exec(body);
  if (typeofMatch !== null && typeofMatch.groups?.['subject'] === parameter) {
    const tag = readLiteral(source, shiftSpan(typeofMatch.indices?.groups?.['literal'], bodyStart));
    return tag === undefined ? undefined : TAG_KINDS.get(tag);
  }

  const expression = RETURNED_EXPRESSION.exec(body)?.groups?.['expression'];
  if (expression === undefined) return undefined;
  if (isNonNullableTest(expression, parameter)) return 'non-nullable-clone';
  if (isNullishTest(expression, parameter)) return 'nullish-clone';

  return undefined;
}

// region | Helpers

/** Moves a span reported within the body to the offset it holds in the whole source. */
function shiftSpan(span: readonly number[] | undefined, offset: number): number[] | undefined {
  const start = span?.[0];
  const end = span?.[1];

  return start === undefined || end === undefined ? undefined : [start + offset, end + offset];
}

// endregion | Helpers
