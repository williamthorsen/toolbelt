import {
  BRACES,
  condenseWhitespace,
  getLineAtOffset,
  PARENTHESES,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

const SORT_CALL = /\.\s*(?:sort|toSorted)\s*\(/g;
const RANDOM_CALL = /Math\s*\.\s*random\s*\(\s*\)/g;
const RETURN_KEYWORD = /\breturn\b/g;
// Digits are left out: a body is claimed for holding nothing but the draw and numeric literals, so what a
// subtraction or a ternary leaves behind has to read as empty.
const IDENTIFIER_CHARACTER = /[A-Za-z_$]/;

/**
 * Lists the line of every biased shuffle in a source file.
 *
 * Takes the blanked code `listArrayIdioms` produces, so a comparator written in a comment or a literal is not
 * one.
 *
 * A comparator is claimed for what its body does not hold rather than for a spelling: strip the draw and a
 * `return` from the body, and a residue carrying no identifier proves the body ordered on the draw alone. That
 * admits the subtractive forms, their mirror, and the ternary forms together, and it declines a comparator
 * that ranks by its operands and reaches for a draw only to break a tie -- a body naming its own parameters,
 * which a shuffle does not reproduce.
 *
 * @internal
 */
export function listBiasedShuffleLines(source: string): number[] {
  const lines: number[] = [];

  for (const match of source.matchAll(SORT_CALL)) {
    const group = readBalancedGroup(source, match.index, PARENTHESES);
    if (group === undefined) continue;

    const argument = condenseWhitespace(source.slice(group.start + 1, group.end - 1));
    if (!isRandomComparator(argument)) continue;

    lines.push(getLineAtOffset(source, match.index));
  }

  return lines;
}

// region | Helpers

/** Reports whether a comparator's body orders on a random draw and nothing else. */
function isRandomComparator(argument: string): boolean {
  const body = readComparatorBody(argument);
  if (body === undefined) return false;

  const withoutDraw = body.replaceAll(RANDOM_CALL, '');
  if (withoutDraw === body) return false;

  return !IDENTIFIER_CHARACTER.test(withoutDraw.replaceAll(RETURN_KEYWORD, ''));
}

/**
 * Returns a comparator's body, or nothing where the argument is neither an arrow nor an inline function.
 *
 * A block body is returned with its braces, which the residue test reads past: only an identifier disqualifies
 * a body, and a brace is not one. A named reference passed as the comparator yields nothing, its body not
 * being here to read.
 */
function readComparatorBody(argument: string): string | undefined {
  const arrow = argument.indexOf('=>');
  if (arrow !== -1) return argument.slice(arrow + 2);

  if (!argument.trimStart().startsWith('function')) return undefined;
  const block = readBalancedGroup(argument, 0, BRACES);

  return block === undefined ? undefined : argument.slice(block.start + 1, block.end - 1);
}

// endregion | Helpers
