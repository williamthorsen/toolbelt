import { blankNonCode, getLineAtOffset, readAnchoredWindow } from '@williamthorsen/toolbelt.adoption';

import { classifySite, type SiteKind } from './classifySite.ts';
import { listDescribeClones } from './listDescribeClones.ts';
import { listMissingPathSites, type MissingPathSite, type MissingPathSiteKind } from './listMissingPathSites.ts';

export interface ErrorSite {
  kind: ErrorSiteKind;
  line: number;
  /** The enclosing function's name, on a `describe-clone` or a `missing-path-clone` alone. */
  symbol?: string;
}

export type ErrorSiteKind = MissingPathSiteKind | SiteKind | 'describe-clone';

const OPERATOR = /\binstanceof\s+Error\b/g;
const WINDOW = { lookahead: 240, lookbehind: 80 };
const AND_AHEAD = /\s*&&/y;

/**
 * Lists every `instanceof Error` and every test of an error's `code` against a missing-path code in a source,
 * each named by what it is doing.
 *
 * A site inside a hand-rolled `describeError` reports as `describe-clone` rather than as the inline site that
 * it also is, so one finding names the function to retire instead of several naming its branches. A missing-path
 * site claims the `instanceof Error` that guards it in the same way, because the advice for the guard on its own
 * would name the wrong substitution.
 *
 * Because the source is blanked before the anchor scan reads it, an `instanceof Error` written in a comment, a
 * string, or a regular expression is invisible here. Blanking preserves every offset, which keeps each reported
 * line number valid in the source.
 *
 * @internal
 */
export function listErrorSites(source: string): ErrorSite[] {
  const code = blankNonCode(source);
  const clones = listDescribeClones(code);
  const missingPathSites = listMissingPathSites(source, code);
  const sites: Array<ErrorSite & { offset: number }> = missingPathSites.map(({ end: _end, start, ...site }) => ({
    ...site,
    offset: start,
  }));
  const claimed = new Set<string>();

  for (const match of code.matchAll(OPERATOR)) {
    if (isClaimedByMissingPathSite(code, match.index + match[0].length, missingPathSites)) continue;

    const clone = clones.find((candidate) => match.index > candidate.start && match.index < candidate.end);
    const line = getLineAtOffset(code, match.index);

    if (clone === undefined) {
      const { after, before } = readAnchoredWindow(code, match.index, WINDOW);
      sites.push({ kind: classifySite(before, after), line, offset: match.index });
    } else if (!claimed.has(clone.name)) {
      claimed.add(clone.name);
      sites.push({ kind: 'describe-clone', line, offset: match.index, symbol: clone.name });
    }
  }

  return sites.toSorted((first, second) => first.offset - second.offset).map(({ offset: _offset, ...site }) => site);
}

// region | Helpers

/**
 * Returns where the operand chain that continues from an offset ends: at the first `;`, `{`, `}`, `,`, `?`, `||`,
 * or line break that `&&` does not continue, outside any group opened after the offset, or at a closing
 * parenthesis or bracket that ends the group enclosing it. A group closed and followed by `&&` wraps the guard
 * alone, as in `(error instanceof Error) &&`, and the chain continues past it. Optional chaining does not end the
 * chain.
 */
function findChainEnd(code: string, from: number): number {
  let depth = 0;
  for (let index = from; index < code.length; index += 1) {
    const character = code[index];
    if (character === '(' || character === '[') depth += 1;
    else if (character === ')' || character === ']') {
      AND_AHEAD.lastIndex = index + 1;
      if (depth === 0 && !AND_AHEAD.test(code)) return index;
      depth = Math.max(0, depth - 1);
    } else if (depth === 0 && isChainBoundary(code, index)) return index;
  }
  return code.length;
}

/** Reports whether the last non-whitespace text before an offset is `&&`. */
function isAfterAnd(code: string, index: number): boolean {
  let last = index - 1;
  while (last >= 0 && /\s/.test(code[last] ?? '')) last -= 1;
  return code[last] === '&' && code[last - 1] === '&';
}

/**
 * Reports whether the character at an offset ends an `&&` chain at the depth that it is read at. A line break ends
 * it unless `&&` ends the line or starts the next, since a source without semicolons ends a statement there.
 */
function isChainBoundary(code: string, index: number): boolean {
  const character = code[index];
  if (character === '?') return code[index + 1] !== '.';
  if (character === '\n') {
    AND_AHEAD.lastIndex = index;
    return !AND_AHEAD.test(code) && !isAfterAnd(code, index);
  }
  return (
    character === ';' || character === '{' || character === '}' || character === ',' || code.startsWith('||', index)
  );
}

/**
 * Reports whether an `instanceof Error` ending at an offset belongs to a missing-path site: It lies inside a
 * missing-path clone, or a missing-path test follows it in the same `&&` chain.
 */
function isClaimedByMissingPathSite(code: string, anchorEnd: number, sites: readonly MissingPathSite[]): boolean {
  if (sites.some((site) => site.kind === 'missing-path-clone' && anchorEnd > site.start && anchorEnd <= site.end)) {
    return true;
  }

  const chainEnd = findChainEnd(code, anchorEnd);
  return sites.some((site) => site.kind !== 'missing-path-clone' && site.start >= anchorEnd && site.start < chainEnd);
}

// endregion | Helpers
