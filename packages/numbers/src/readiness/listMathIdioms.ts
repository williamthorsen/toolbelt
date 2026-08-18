import { type AdoptionSite, blankNonCode } from '@williamthorsen/toolbelt.adoption';

import { listClampNestLines } from './listClampNestLines.ts';
import { listRandomIntegerLines } from './listRandomIntegerLines.ts';
import { listRoundScaleLines } from './listRoundScaleLines.ts';

export type MathIdiomKind = 'clamp-nest' | 'random-integer' | 'round-scale';

/**
 * Lists every hand-rolled arithmetic idiom in a source file that this package publishes a utility for.
 *
 * The three idioms share no anchor, so each is matched by its own detector and the results are merged in line
 * order. A file holding two of them reports both.
 *
 * The source is blanked once here and the three read what it produces, so an idiom written in a comment or a
 * literal is invisible to all of them. Blanking preserves every offset, so a reported line still names the line
 * the source holds.
 *
 * @internal
 */
export function listMathIdioms(source: string): Array<AdoptionSite<MathIdiomKind>> {
  const code = blankNonCode(source);
  const sites = [
    ...toSites('clamp-nest', listClampNestLines(code)),
    ...toSites('random-integer', listRandomIntegerLines(code)),
    ...toSites('round-scale', listRoundScaleLines(code)),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

function toSites(kind: MathIdiomKind, lines: readonly number[]): Array<AdoptionSite<MathIdiomKind>> {
  return lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
