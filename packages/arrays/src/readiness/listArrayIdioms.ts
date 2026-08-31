import { type AdoptionSite, blankNonCode } from '@williamthorsen/toolbelt.adoption';

import { listArraifyLines } from './listArraifyLines.ts';
import { listBiasedShuffleLines } from './listBiasedShuffleLines.ts';
import { listRandomItemLines } from './listRandomItemLines.ts';

export type ArrayIdiomKind = 'arraify-inline' | 'biased-shuffle' | 'random-item';

/**
 * Lists every hand-rolled array idiom in a source file that this package publishes a utility for.
 *
 * The three idioms share no anchor, so each is matched by its own detector and the results are merged in line
 * order. A source holding more than one idiom reports each of them.
 *
 * The source is blanked once here and every detector reads what it produces, so an idiom written in a comment
 * or a literal is invisible to them. Blanking preserves every offset, so a reported line still names the line
 * the source holds.
 *
 * @internal
 */
export function listArrayIdioms(source: string): Array<AdoptionSite<ArrayIdiomKind>> {
  const code = blankNonCode(source);
  const sites = [
    ...toSites('arraify-inline', listArraifyLines(code)),
    ...toSites('biased-shuffle', listBiasedShuffleLines(code)),
    ...toSites('random-item', listRandomItemLines(code)),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

function toSites(kind: ArrayIdiomKind, lines: readonly number[]): Array<AdoptionSite<ArrayIdiomKind>> {
  return lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
