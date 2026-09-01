import { blankNonCode, getLineAtOffset, readAnchoredWindow } from '@williamthorsen/toolbelt.adoption';

import { classifySite, type SiteKind } from './classifySite.ts';
import { listDescribeClones } from './listDescribeClones.ts';

export interface ErrorSite {
  kind: ErrorSiteKind;
  line: number;
  /** The enclosing function's name, on a `describe-clone` alone. */
  symbol?: string;
}

export type ErrorSiteKind = SiteKind | 'describe-clone';

const OPERATOR = /\binstanceof\s+Error\b/g;
const WINDOW = { lookahead: 240, lookbehind: 80 };

/**
 * Lists every `instanceof Error` in a source file, each named by what it is doing.
 *
 * A site inside a hand-rolled `describeError` reports as `describe-clone` rather than as the inline site it
 * also is, so one finding names the function to retire instead of several naming its branches.
 *
 * The source is blanked before the anchor scan reads it, so an `instanceof Error` written in a comment, a
 * string, or a regular expression is invisible here. Blanking preserves every offset, so a reported line still
 * names the line held by the source.
 *
 * @internal
 */
export function listErrorSites(source: string): ErrorSite[] {
  const code = blankNonCode(source);
  const clones = listDescribeClones(code);
  const sites: ErrorSite[] = [];
  const claimed = new Set<string>();

  for (const match of code.matchAll(OPERATOR)) {
    const clone = clones.find((candidate) => match.index > candidate.start && match.index < candidate.end);
    const line = getLineAtOffset(code, match.index);

    if (clone === undefined) {
      const { after, before } = readAnchoredWindow(code, match.index, WINDOW);
      sites.push({ kind: classifySite(before, after), line });
    } else if (!claimed.has(clone.name)) {
      claimed.add(clone.name);
      sites.push({ kind: 'describe-clone', line, symbol: clone.name });
    }
  }

  return sites;
}
