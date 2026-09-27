/**
 * Returns the number rounded to the given number of decimal places.
 * @param value
 * @param nDecimalPlaces
 *
 * @category Number
 * @experimental
 * @stage candidate
 */
export function round(value: number, nDecimalPlaces = 0): number {
  const factor = 10 ** nDecimalPlaces;
  return Math.round(value * factor) / factor;
}
