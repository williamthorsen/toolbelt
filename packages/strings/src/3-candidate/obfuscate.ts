import { clamp } from '@williamthorsen/toolbelt.numbers/candidate';

/**
 * Returns a string in which all but an optional number of characters at its extremes are replaced with asterisks.
 * Throws if bookendSize is negative or NaN, if fillChar is not a single character, or if fillSize is NaN,
 * less than 1, or less than bookendSize.
 * @experimental
 * @stage candidate
 */
export function obfuscate(str: string, options: Options = {}): string {
  const { bookendSize = 0, fillChar = '*', fillSize } = options;

  // Validations
  if (Number.isNaN(bookendSize)) {
    throw new Error('bookendSize cannot be NaN.');
  }
  if (bookendSize < 0) {
    throw new Error('Minimum bookendSize is 0.');
  }
  if (fillChar.length !== 1) {
    throw new Error('fillChar must be a single character.');
  }
  if (fillSize !== undefined) {
    if (Number.isNaN(fillSize)) throw new Error('fillSize cannot be NaN.');
    if (fillSize < bookendSize) throw new Error('fillSize cannot be less than bookendSize.');
    if (fillSize < 1) throw new Error('Minimum fillSize is 1.');
  }

  // Reveal at most `bookendSize` whole characters per end, and only while at least `bookendSize` stay hidden.
  const nBookendChars = clamp(Math.floor((str.length - bookendSize) / 2), { max: Math.floor(bookendSize), min: 0 });

  const start = str.slice(0, nBookendChars);
  const end = str.slice(Math.max(start.length, str.length - nBookendChars));
  const fill = fillChar.repeat(Math.max(0, str.length - nBookendChars * 2));

  const constrainedFill = fillSize === undefined ? fill : fill.slice(0, fillSize);

  return [start, constrainedFill, end].join('');
}

interface Options {
  bookendSize?: number | undefined;
  fillChar?: string | undefined;
  fillSize?: number | undefined;
}
