import { getLineAtOffset, isArraySubscript, readAnchoredWindow } from '@williamthorsen/toolbelt.adoption';

const FLOORED_RANDOM = /\bMath\.floor\s*\(\s*Math\.random\s*\(\s*\)\s*\*/g;
// Only the lookbehind is read, and only far enough to see the expression that a subscript bracket would follow.
const WINDOW = { lookahead: 0, lookbehind: 80 };

/**
 * Lists the line of every hand-rolled random item in a source file.
 *
 * Takes the blanked code produced by `listArrayIdioms`, so an index written in a comment or a literal is not one.
 *
 * A site is claimed for standing in array-subscript position, whatever it scales the draw by. That is the
 * whole set that `toolbelt.numbers` declines, and both kits read the answer from the same predicate, so
 * every floored random is claimed by exactly one of them.
 *
 * @internal
 */
export function listRandomItemLines(source: string): number[] {
  const lines: number[] = [];

  for (const match of source.matchAll(FLOORED_RANDOM)) {
    const { before } = readAnchoredWindow(source, match.index, WINDOW);
    if (!isArraySubscript(before)) continue;

    lines.push(getLineAtOffset(source, match.index));
  }

  return lines;
}
