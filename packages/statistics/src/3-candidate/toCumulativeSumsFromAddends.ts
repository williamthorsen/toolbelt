import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Given an array of addends, returns the running total at each index.
 *
 * @category Statistics
 * @stage candidate
 */
export function toCumulativeSumsFromAddends(addends: number[]): number[] {
  if (addends.length === 0) {
    return addends;
  }

  let sum = getAtIndexOrThrow(addends, 0);
  const cumulativeSums = [sum];
  for (let i = 1; i < addends.length; i++) {
    sum += getAtIndexOrThrow(addends, i);
    cumulativeSums.push(sum);
  }
  return cumulativeSums;
}
