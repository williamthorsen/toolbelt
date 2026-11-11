import { toCumulativeValues } from '@williamthorsen/toolbelt.arrays/candidate';

/**
 * Returns the running total of the addends at each index.
 *
 * @category Statistics
 * @stage candidate
 */
export function toCumulativeSumsFromAddends(addends: number[]): number[] {
  return toCumulativeValues(addends);
}
