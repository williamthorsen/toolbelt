/**
 * Returns an array in which each element contains the running total of the input array up to the same index.
 * Undefined values are treated as 0.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function toCumulativeValues(values: ReadonlyArray<number | undefined>): number[] {
  const cumulativeValues: number[] = [];
  let cumulativeValue = 0;

  for (const value of values) {
    cumulativeValue += value ?? 0;
    cumulativeValues.push(cumulativeValue);
  }

  return cumulativeValues;
}
