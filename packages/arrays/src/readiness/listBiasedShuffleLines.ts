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
// The unparenthesized single-parameter arrow. Whitespace is condensed by the time this reads, so one space
// is the most that can sit at the joint.
const BARE_PARAMETER_ARROW = /^[\w$]+\s?=>/;
const FUNCTION_KEYWORD = /^function\b/;
// Digits are left out: a body is claimed for holding nothing but the draw and numeric literals, so what a
// subtraction or a ternary leaves behind has to read as empty.
const IDENTIFIER_CHARACTER = /[A-Za-z_$]/;

/**
 * Lists the line of every biased shuffle in a source file.
 *
 * Takes the blanked code produced by `listArrayIdioms`, so a comparator written in a comment or a literal is not
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

/**
 * Returns the offset of the arrow whose body is the argument's own, or nothing where the argument is no arrow.
 *
 * The arrow has to open the argument. A combinator assembling a comparator takes an arrow of its own, and an
 * arrow found anywhere in the text would be that one, whose body belongs to a function that this argument
 * only passes along. Anything between the parameter list and the arrow is a return-type annotation.
 */
function findArrowOffset(text: string): number | undefined {
  const parameters = readBalancedGroup(text, 0, PARENTHESES);
  if (parameters?.start === 0) {
    const arrow = text.indexOf('=>', parameters.end);
    return arrow === -1 ? undefined : arrow;
  }

  return BARE_PARAMETER_ARROW.test(text) ? text.indexOf('=>') : undefined;
}

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
  const text = stripWrappingGroup(argument.trimStart());

  if (FUNCTION_KEYWORD.test(text)) {
    const block = readBalancedGroup(text, 0, BRACES);
    return block === undefined ? undefined : text.slice(block.start + 1, block.end - 1);
  }

  const arrow = findArrowOffset(text);

  return arrow === undefined ? undefined : text.slice(arrow + 2);
}

/**
 * Returns the comparator text with every parenthesis group wrapping the whole comparator stripped.
 *
 * A redundant parenthesis and the operand of a cast both wrap the arrow rather than opening it, which is what
 * an opening group holding no arrow past it reports. Stripping cannot admit a combinator, whose group opens
 * past offset zero and is left as it stands.
 */
function stripWrappingGroup(text: string): string {
  let stripped = text;
  let group = readBalancedGroup(stripped, 0, PARENTHESES);

  while (group?.start === 0 && !stripped.includes('=>', group.end)) {
    stripped = stripped.slice(1, group.end - 1).trimStart();
    group = readBalancedGroup(stripped, 0, PARENTHESES);
  }

  return stripped;
}

// endregion | Helpers
