/**
 * Returns the number rounded to the given number of decimal places, or 0 if no nDecimalPlaces is specified.
 * @param value
 * @param nDecimalPlaces
 */
export function round(value: number, nDecimalPlaces = 0): number {
  const factor = 10 ** nDecimalPlaces;
  return Math.round(value * factor) / factor;
}
