import { type AdoptionSite, blankNonCode } from '@williamthorsen/toolbelt.adoption';

import { listOwnPropertyCallLines } from './listOwnPropertyCallLines.ts';
import { listRecordLines } from './listRecordLines.ts';
import { listStringifyCompareLines } from './listStringifyCompareLines.ts';

export type ObjectIdiomKind = 'own-property-call' | 'record-inline' | 'stringify-compare';

/**
 * Lists every hand-rolled object idiom in a source file that this package publishes a utility for.
 *
 * The three idioms share no anchor, so each is matched by its own detector and the results are merged in line
 * order. A source holding more than one idiom reports each of them.
 *
 * The source is blanked once here and every detector reads what it produces, so an idiom written in a comment
 * or a literal is invisible to them. Blanking preserves every offset, so a reported line still names the line
 * the source holds, and the record detector can still read its literal from the source beneath.
 *
 * @internal
 */
export function listObjectIdioms(source: string): Array<AdoptionSite<ObjectIdiomKind>> {
  const code = blankNonCode(source);
  const sites = [
    ...toSites('own-property-call', listOwnPropertyCallLines(code)),
    ...toSites('record-inline', listRecordLines(code, source)),
    ...toSites('stringify-compare', listStringifyCompareLines(code)),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

function toSites(kind: ObjectIdiomKind, lines: readonly number[]): Array<AdoptionSite<ObjectIdiomKind>> {
  return lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
