import { getAtIndexOrThrow } from './getAtIndexOrThrow.ts';

/**
 * Returns the index of the first cumulative weight that is greater than or equal to the target weight.
 * The caller is expected to ensure that the cumulative weights are non-decreasing.
 * Returns `undefined` if the target weight is outside the range of the cumulative weights, i.e., is
 * - negative or
 * - greater than the highest cumulative weight.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function findWeightedIndex(cumulativeWeights: ReadonlyArray<number>, targetWeight: number): Integer | undefined {
  // Quick exits:
  // - if the array is empty
  if (cumulativeWeights.length === 0) {
    return undefined;
  }
  // - if the target weight is negative
  if (targetWeight < 0) {
    return undefined;
  }

  // If performance ever becomes a concern, replace this sequential search with a binary search.
  for (let i = 0; i < cumulativeWeights.length; i++) {
    if (targetWeight <= getAtIndexOrThrow(cumulativeWeights, i)) {
      return i;
    }
  }
  return undefined;
}

type Integer = number;
