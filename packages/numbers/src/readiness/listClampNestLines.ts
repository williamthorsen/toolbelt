import {
  getLineAtOffset,
  listTopLevelArguments,
  PARENTHESES,
  readBalancedGroup,
} from '@williamthorsen/toolbelt.adoption';

type BoundingName = 'max' | 'min';

const BOUNDING_CALL = /\bMath\.(?<name>max|min)\s*\(/g;
const NESTED_HEAD: Record<BoundingName, RegExp> = { max: /^Math\.max\s*\(/, min: /^Math\.min\s*\(/ };
const OPPOSITE: Record<BoundingName, BoundingName> = { max: 'min', min: 'max' };

/**
 * Lists the line of every hand-rolled clamp in a source file.
 *
 * Takes the blanked code produced by `listMathIdioms`, so a clamp written in a comment or a literal is not one.
 *
 * A clamp is a two-argument `Math.max` containing a two-argument `Math.min`, or the mirror of that, with the
 * nested call in either argument position. Because the nested call's own anchor falls inside the outer call, it
 * is suppressed, and one clamp is reported once rather than twice.
 *
 * An inner call taking any number of arguments but two is not a clamp: `Math.max(a, Math.min(b, c, d))` is the
 * larger of `a` and the smallest of three, which `clamp` cannot express.
 *
 * @internal
 */
export function listClampNestLines(source: string): number[] {
  const lines: number[] = [];
  let claimedUntil = 0;

  for (const match of source.matchAll(BOUNDING_CALL)) {
    if (match.index < claimedUntil) continue;

    const name = readBoundingName(match.groups?.['name']);
    if (name === undefined) continue;

    const group = readBalancedGroup(source, match.index, PARENTHESES);
    if (group === undefined) continue;

    const args = listTopLevelArguments(source.slice(group.start + 1, group.end - 1));
    if (args.length !== 2 || args.every((argument) => !isBoundingCall(argument, OPPOSITE[name]))) continue;

    claimedUntil = group.end;
    lines.push(getLineAtOffset(source, match.index));
  }

  return lines;
}

// region | Helpers

/** Reports whether an argument is exactly a two-argument call to the named bounding function. */
function isBoundingCall(argument: string, name: BoundingName): boolean {
  const text = argument.trim();
  if (!NESTED_HEAD[name].test(text)) return false;

  const group = readBalancedGroup(text, 0, PARENTHESES);
  // A group ending short of the text is a call with something appended, such as `Math.min(a, b) + 1`.
  if (group === undefined || group.end !== text.length) return false;

  return listTopLevelArguments(text.slice(group.start + 1, group.end - 1)).length === 2;
}

/** Narrows a captured name to the two that the pattern can produce. */
function readBoundingName(name: string | undefined): BoundingName | undefined {
  return name === 'max' || name === 'min' ? name : undefined;
}

// endregion | Helpers
