import { getLineAtOffset, PARENTHESES, readBalancedGroup } from '@williamthorsen/toolbelt.adoption';

// A power of ten written as a literal or as an exponentiation. The exponentiation alternative leads, so `10`
// is not matched off the front of `10 ** n`.
const POWER_OF_TEN = String.raw`10\s*\*\*\s*[\w$]+|10+`;
const ROUND_CALL = /\bMath\.round\s*\(/g;
// The optional comma is the one that a formatter leaves behind when it wraps the call's arguments.
const TRAILING_FACTOR = new RegExp(String.raw`\*\s*(?<factor>${POWER_OF_TEN})\s*,?\s*$`);
const LEADING_DIVISOR = new RegExp(String.raw`^\s*/\s*(?<divisor>${POWER_OF_TEN})(?![\w$.])`);

/**
 * Lists the line of every hand-rolled decimal rounding in a source file.
 *
 * Takes the blanked code produced by `listMathIdioms`, so a rounding written in a comment or a literal is not one.
 *
 * The idiom scales a value by a power of ten, rounds, and scales back by the same power. Both sides must name
 * the same factor and it must be a power of ten: `Math.round(x * 3) / 3` rounds to thirds, which `round`
 * cannot express, and recommending it there would change the answer.
 *
 * @internal
 */
export function listRoundScaleLines(source: string): number[] {
  const lines: number[] = [];

  for (const match of source.matchAll(ROUND_CALL)) {
    const group = readBalancedGroup(source, match.index, PARENTHESES);
    if (group === undefined) continue;

    const factor = TRAILING_FACTOR.exec(source.slice(group.start + 1, group.end - 1))?.groups?.['factor'];
    if (factor === undefined) continue;

    const divisor = LEADING_DIVISOR.exec(source.slice(group.end))?.groups?.['divisor'];
    if (divisor === undefined || !isSameFactor(factor, divisor)) continue;

    lines.push(getLineAtOffset(source, match.index));
  }

  return lines;
}

// region | Helpers

/** Compares two factors as written, ignoring the spacing that a formatter may have put around `**`. */
function isSameFactor(factor: string, divisor: string): boolean {
  return factor.replaceAll(/\s+/g, '') === divisor.replaceAll(/\s+/g, '');
}

// endregion | Helpers
