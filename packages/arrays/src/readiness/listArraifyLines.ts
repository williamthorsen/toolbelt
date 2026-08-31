import { getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

// The subject is captured once and matched again in both branches, which is what makes the ternary a wrap
// rather than a choice between two unrelated values. `\s*` sits at every joint because the expression has no
// fixed-width span to bound and a formatter may wrap it at any of them. Each bare backreference carries a
// trailing lookahead, so a branch reading `xs` or `x.tail` is not mistaken for the subject `x`.
const SUBJECT = String.raw`(?<subject>[\w$]+(?:\.[\w$]+)*)`;
const SUBJECT_AGAIN = String.raw`\k<subject>(?![\w$.])`;
const WRAPPED = String.raw`\[\s*\k<subject>\s*\]`;
const PASSED_THROUGH = String.raw`(?:${SUBJECT_AGAIN}|\[\s*\.\.\.\s*\k<subject>\s*\])`;
const IS_ARRAY_CALL = String.raw`Array\s*\.\s*isArray\s*\(\s*${SUBJECT}\s*\)`;

const ARRAIFY_TERNARY = new RegExp(
  String.raw`(?<![\w$.])${IS_ARRAY_CALL}\s*\?\s*${PASSED_THROUGH}\s*:\s*${WRAPPED}`,
  'g',
);
const NEGATED_ARRAIFY_TERNARY = new RegExp(
  String.raw`(?<![\w$.])!\s*${IS_ARRAY_CALL}\s*\?\s*${WRAPPED}\s*:\s*${PASSED_THROUGH}`,
  'g',
);

/**
 * Lists the line of every hand-rolled array wrap in a source file.
 *
 * Takes the blanked code `listArrayIdioms` produces, so a ternary written in a comment or a literal is not
 * one.
 *
 * Both polarities are claimed, and in each the array branch may pass the value through or spread it into a new
 * array. The spread is the one form the substitution is exact from; the other two hand back the value itself,
 * which is the limit the kit's advice names.
 *
 * A polarity is matched in a pass of its own, so the lines are sorted before they are returned.
 *
 * @internal
 */
export function listArraifyLines(source: string): number[] {
  return [ARRAIFY_TERNARY, NEGATED_ARRAIFY_TERNARY]
    .flatMap((pattern) => source.matchAll(pattern).toArray())
    .map((match) => getLineAtOffset(source, match.index))
    .toSorted((a, b) => a - b);
}
