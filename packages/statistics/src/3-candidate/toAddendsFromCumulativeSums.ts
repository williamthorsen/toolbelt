import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Given an array of cumulative weights, returns the weights for each interval.
 */
export function toAddendsFromCumulativeSums(cumulativeSums: number[]): number[] {
  if (cumulativeSums.length === 0) {
    return cumulativeSums;
  }

  const addends = [getAtIndexOrThrow(cumulativeSums, 0)];
  for (let i = 1; i < cumulativeSums.length; i++) {
    addends.push(getAtIndexOrThrow(cumulativeSums, i) - getAtIndexOrThrow(cumulativeSums, i - 1));
  }
  return addends;
}
