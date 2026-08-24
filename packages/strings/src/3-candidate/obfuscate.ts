import { clamp } from '@williamthorsen/toolbelt.numbers/candidate';

/**
 * Returns a string in which all but an optional number of characters at its extremes are replaced with asterisks.
 * Throws a TypeError if bookendSize or fillSize is NaN or if fillChar is not a single character, and a RangeError
 * if bookendSize is negative, if fillSize is less than 1, or if fillSize is less than bookendSize.
 * @category String
 * @experimental
 * @stage candidate
 */
export function obfuscate(str: string, options: Options = {}): string {
  const { bookendSize = 0, fillChar = '*', fillSize } = options;

  // Validations
  if (Number.isNaN(bookendSize)) {
    throw new TypeError('bookendSize cannot be NaN.');
  }
  if (bookendSize < 0) {
    throw new RangeError('Minimum bookendSize is 0.');
  }
  if (fillChar.length !== 1) {
    throw new TypeError('fillChar must be a single character.');
  }
  if (fillSize !== undefined) {
    if (Number.isNaN(fillSize)) throw new TypeError('fillSize cannot be NaN.');
    if (fillSize < bookendSize) throw new RangeError('fillSize cannot be less than bookendSize.');
    if (fillSize < 1) throw new RangeError('Minimum fillSize is 1.');
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
