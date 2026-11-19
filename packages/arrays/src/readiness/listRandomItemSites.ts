import {
  type AdoptionSite,
  getLineAtOffset,
  isArraySubscript,
  readAnchoredWindow,
} from '@williamthorsen/toolbelt.adoption';

const FLOORED_RANDOM = /\bMath\.floor\s*\(\s*Math\.random\s*\(\s*\)\s*\*/g;
// Only the lookbehind is read, and only far enough to see the expression that a subscript bracket would follow.
const WINDOW = { lookahead: 0, lookbehind: 80 };

/**
 * Lists every hand-rolled random item in a source file.
 *
 * Takes the code blanked by the kit assembler, so an index written in a comment or a literal is not one.
 *
 * A site is claimed for standing in array-subscript position, whatever it scales the draw by. That is the
 * whole set that `toolbelt.numbers` declines. Because both kits read the answer from the same predicate,
 * every floored random is claimed by exactly one of them.
 *
 * @internal
 */
export function listRandomItemSites(code: string): Array<AdoptionSite<'random-item'>> {
  const sites: Array<AdoptionSite<'random-item'>> = [];

  for (const match of code.matchAll(FLOORED_RANDOM)) {
    const { before } = readAnchoredWindow(code, match.index, WINDOW);
    if (!isArraySubscript(before)) continue;

    sites.push({ kind: 'random-item', line: getLineAtOffset(code, match.index) });
  }

  return sites;
}
