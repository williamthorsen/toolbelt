/**
 * Returns a string in which all but an optional number of characters at its extremes are replaced with asterisks.
 * @experimental
 * @stage candidate
 */
export function obfuscate(str: string, options: Options = {}): string {
  const { bookendSize = 0, fillChar = '*', fillSize } = options;

  // Validations
  if (bookendSize < 0) {
    throw new Error('Minimum bookendSize is 0.');
  }
  if (fillChar.length !== 1) {
    throw new Error('fillChar must be a single character.');
  }
  if (fillSize !== undefined) {
    if (fillSize < bookendSize) throw new Error('fillSize cannot be less than bookendSize.');
    if (fillSize < 1) throw new Error('Minimum fillSize is 1.');
  }

  const nBookendChars = Math.min(
    Math.floor(bookendSize), // ignore decimal part of `bookendSize`
    Math.max(0, Math.floor((str.length - bookendSize) / 2)), // hide at least `bookendSize` characters
  );

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
