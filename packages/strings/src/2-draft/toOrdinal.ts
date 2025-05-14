/**
 * Converts an integer to its ordinal representation (e.g., 1 -> "1st", 2 -> "2nd").
 * Handles special cases for numbers ending in 11, 12, or 13, and supports negative numbers.
 *
 * @param {number} int - The integer to convert to an ordinal string.
 * @returns {string} The ordinal representation of the input integer.
 *
 * @example
 * toOrdinal(1); // "1st"
 * toOrdinal(11); // "11th"
 * toOrdinal(-3); // "-3rd"
 *
 * @experimental
 * @stage draft
 */
export function toOrdinal(int: number): string {
  const absInt = Math.abs(int);
  const lastTwoDigits = absInt % 100;
  const lastDigit = absInt % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${int}th`;
  }

  const endingsMap: Record<number, string> = {
    1: 'st',
    2: 'nd',
    3: 'rd',
  };

  const ending = endingsMap[lastDigit] || 'th';
  return `${int}${ending}`;
}
