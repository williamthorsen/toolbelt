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
 * Lists every hand-rolled random integer in a source file.
 *
 * Takes the code blanked by the kit assembler, so an idiom written in a comment or a literal is not one.
 *
 * A site in array-subscript position is left out: It is `toolbelt.arrays`' random-item idiom, whose kit
 * recommends `pickItem`. Leaving it out rather than reporting it under an unclaimed kind keeps it out of the
 * denominator too: Only `pickItem` replaces it.
 *
 * @internal
 */
export function listRandomIntegerSites(code: string): Array<AdoptionSite<'random-integer'>> {
  const sites: Array<AdoptionSite<'random-integer'>> = [];

  for (const match of code.matchAll(FLOORED_RANDOM)) {
    const { before } = readAnchoredWindow(code, match.index, WINDOW);
    if (isArraySubscript(before)) continue;

    sites.push({ kind: 'random-integer', line: getLineAtOffset(code, match.index) });
  }

  return sites;
}
