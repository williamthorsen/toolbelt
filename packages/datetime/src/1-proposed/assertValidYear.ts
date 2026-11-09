/**
 * Throws a `RangeError` unless the year is a safe non-negative integer.
 */
export function assertValidYear(year: number): void | never {
  if (!Number.isSafeInteger(year) || year < 0) {
    throw new RangeError(`Year must be a non-negative safe integer, but was ${year}.`);
  }
}
