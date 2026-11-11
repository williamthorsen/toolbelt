/**
 * Returns the addends whose running totals are the given cumulative sums.
 *
 * @category Statistics
 * @stage candidate
 */
export function toAddendsFromCumulativeSums(cumulativeSums: number[]): number[] {
  const addends: number[] = [];
  let previousSum = 0;

  for (const sum of cumulativeSums) {
    addends.push(sum - previousSum);
    previousSum = sum;
  }

  return addends;
}
