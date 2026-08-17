export interface DelimitedGroup {
  /** One past the closing delimiter. */
  end: number;
  /** The opening delimiter's own offset. */
  start: number;
}

export interface Delimiters {
  close: string;
  open: string;
}

export const BRACES: Delimiters = { close: '}', open: '{' };
export const PARENTHESES: Delimiters = { close: ')', open: '(' };

/**
 * Locates the first balanced delimiter group at or after an offset, or nothing where it never balances.
 *
 * Returning nothing rather than the remainder is load-bearing for any caller whose verdict rests on what a
 * group does not contain: past the unbalanced point the text is invisible rather than absent, so a group read
 * only in part must not be treated as a group read in full.
 *
 * @internal
 */
export function readBalancedGroup(source: string, from: number, delimiters: Delimiters): DelimitedGroup | undefined {
  const start = source.indexOf(delimiters.open, from);
  if (start === -1) return undefined;

  let depth = 0;
  for (let index = start; index < source.length; index += 1) {
    if (source[index] === delimiters.open) depth += 1;
    else if (source[index] === delimiters.close) {
      depth -= 1;
      if (depth === 0) return { end: index + 1, start };
    }
  }

  return undefined;
}
