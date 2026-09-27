import { type AdoptionSite, blankNonCode } from '@williamthorsen/toolbelt.adoption';

import { listCapitalizeLines } from './listCapitalizeLines.ts';
import { listJoinedLineArrays } from './listJoinedLineArrays.ts';
import { listLayoutBreakingTemplates } from './listLayoutBreakingTemplates.ts';
import { listPluralizeLines } from './listPluralizeLines.ts';

export type StringIdiomKind =
  'capitalize-inline' | 'joined-line-array' | 'layout-breaking-template' | 'pluralize-inline';

/**
 * Lists every hand-rolled string idiom in a source file that this package publishes a utility for.
 *
 * The idioms share no anchor, so each is matched by its own detector and the results are merged in line order. For
 * a file that contains several, each of them is reported.
 *
 * Because the source is blanked once here and every detector reads what it produces, an idiom written in a comment
 * or a literal is invisible to them. Blanking preserves every offset, which keeps each reported line number valid
 * in the source and lets a detector that needs a literal's contents read them from the source beneath.
 *
 * @internal
 */
export function listStringIdioms(source: string): Array<AdoptionSite<StringIdiomKind>> {
  const code = blankNonCode(source);
  const sites = [
    ...toSites('capitalize-inline', listCapitalizeLines(code)),
    ...toSites('joined-line-array', listJoinedLineArrays(code, source)),
    ...toSites('layout-breaking-template', listLayoutBreakingTemplates(code, source)),
    ...toSites('pluralize-inline', listPluralizeLines(code, source)),
  ];

  return sites.toSorted((a, b) => a.line - b.line);
}

// region | Helpers

/** Pairs each line with the idiom kind found on it. */
function toSites(kind: StringIdiomKind, lines: readonly number[]): Array<AdoptionSite<StringIdiomKind>> {
  return lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
