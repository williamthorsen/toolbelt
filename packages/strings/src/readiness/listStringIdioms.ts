import { type AdoptionSite, blankNonCode } from '@williamthorsen/toolbelt.adoption';

import { listCapitalizeLines } from './listCapitalizeLines.ts';
import { listPluralizeLines } from './listPluralizeLines.ts';

export type StringIdiomKind = 'capitalize-inline' | 'pluralize-inline';

/**
 * Lists every hand-rolled string idiom in a source file that this package publishes a utility for.
 *
 * The two idioms share no anchor, so each is matched by its own detector and the results are merged in line
 * order. A file holding both reports both.
 *
 * The source is blanked once here and both detectors read what it produces, so an idiom written in a comment
 * or a literal is invisible to them. Blanking preserves every offset, so a reported line still names the line
 * the source holds, and the pluralize detector can still read its literals from the source beneath.
 *
 * @internal
 */
export function listStringIdioms(source: string): Array<AdoptionSite<StringIdiomKind>> {
  const code = blankNonCode(source);
  const sites = [
    ...toSites('capitalize-inline', listCapitalizeLines(code)),
    ...toSites('pluralize-inline', listPluralizeLines(code, source)),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

function toSites(kind: StringIdiomKind, lines: readonly number[]): Array<AdoptionSite<StringIdiomKind>> {
  return lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
