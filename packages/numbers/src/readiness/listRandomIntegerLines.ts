import { getLineAtOffset, isArraySubscript, readAnchoredWindow } from '@williamthorsen/toolbelt.adoption';

const FLOORED_RANDOM = /\bMath\.floor\s*\(\s*Math\.random\s*\(\s*\)\s*\*/g;
// Only the lookbehind is read, and only far enough to see the expression that a subscript bracket would follow.
const WINDOW = { lookahead: 0, lookbehind: 80 };

/**
 * Lists the line of every hand-rolled random integer in a source file.
 *
 * Takes the blanked code produced by `listMathIdioms`, so an idiom written in a comment or a literal is not one.
 *
 * A site in array-subscript position is left out: it is `toolbelt.arrays`' random-item idiom, whose kit
 * recommends `pickItem`. Leaving it out rather than reporting it under an unclaimed kind keeps it out of the
 * denominator too, which no check here could ever close.
 *
 * @internal
 */
export function listRandomIntegerLines(source: string): number[] {
  const lines: number[] = [];

  for (const match of source.matchAll(FLOORED_RANDOM)) {
    const { before } = readAnchoredWindow(source, match.index, WINDOW);
    if (isArraySubscript(before)) continue;

    lines.push(getLineAtOffset(source, match.index));
  }

  return lines;
}
