import type { AdoptionSite } from '@williamthorsen/toolbelt.adoption';

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
 * @internal
 */
export function listMathIdioms(source: string): Array<AdoptionSite<MathIdiomKind>> {
  const sites = [
    ...toSites('clamp-nest', listClampNestLines(source)),
    ...toSites('random-integer', listRandomIntegerLines(source)),
    ...toSites('round-scale', listRoundScaleLines(source)),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

function toSites(kind: MathIdiomKind, lines: readonly number[]): Array<AdoptionSite<MathIdiomKind>> {
  return lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
