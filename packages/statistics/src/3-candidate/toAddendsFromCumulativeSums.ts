import { getItemAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Given an array of cumulative weights, returns the weights for each interval.
 *
 * @category Statistics
 * @stage candidate
 */
export function toAddendsFromCumulativeSums(cumulativeSums: number[]): number[] {
  if (cumulativeSums.length === 0) {
    return cumulativeSums;
  }

  const addends = [getItemAtIndexOrThrow(cumulativeSums, 0)];
  for (let i = 1; i < cumulativeSums.length; i++) {
    addends.push(getItemAtIndexOrThrow(cumulativeSums, i) - getItemAtIndexOrThrow(cumulativeSums, i - 1));
  }
  return addends;
}
