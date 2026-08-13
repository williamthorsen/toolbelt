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
const LOOKBEHIND = 80;
const LOOKAHEAD = 240;

/**
 * Lists every `instanceof Error` in a source file, each named by what it is doing.
 *
 * A site inside a hand-rolled `describeError` reports as `describe-clone` rather than as the inline site it
 * also is, so one finding names the function to retire instead of several naming its branches.
 *
 * @internal
 */
export function listErrorSites(source: string): ErrorSite[] {
  const clones = listDescribeClones(source);
  const sites: ErrorSite[] = [];
  const claimed = new Set<string>();

  OPERATOR.lastIndex = 0;
  let match = OPERATOR.exec(source);
  while (match !== null) {
    const clone = clones.find(
      (candidate) => match !== null && match.index > candidate.start && match.index < candidate.end,
    );
    const line = countLines(source, match.index);

    if (clone === undefined) {
      const before = collapse(source.slice(Math.max(0, match.index - LOOKBEHIND), match.index));
      const after = collapse(source.slice(match.index, match.index + LOOKAHEAD));
      sites.push({ kind: classifySite(before, after), line });
    } else if (!claimed.has(clone.name)) {
      claimed.add(clone.name);
      sites.push({ kind: 'describe-clone', line, symbol: clone.name });
    }

    match = OPERATOR.exec(source);
  }

  return sites;
}

// region | Helpers

/** Collapses whitespace runs so a window reads the same however the source was wrapped. */
function collapse(text: string): string {
  return text.replaceAll(/\s+/g, ' ');
}

/** Returns the 1-based line holding an offset. */
function countLines(source: string, index: number): number {
  let line = 1;
  for (let cursor = 0; cursor < index; cursor += 1) {
    if (source[cursor] === '\n') line += 1;
  }
  return line;
}

// endregion | Helpers
