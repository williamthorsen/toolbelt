import { extractWeights } from '../3-candidate/extractWeights.ts';
import { toCumulativeValues } from '../3-candidate/toCumulativeValues.ts';

/**
 * Extracts weights from an array of items and returns an array of cumulative weights.
 * If all weights are undefined, returns an array of uniformly cumulative weights.
 * If any weights are defined, undefined weights are treated as 0.
 *
 * @category Array
 * @experimental
 * @stage proposed
 */
export function accumulateWeights<T>(
  items: ReadonlyArray<T>,
  getWeight: (item: T, index: number, items: ReadonlyArray<T>) => number | undefined,
): number[] {
  const weights = extractWeights(items, getWeight);
  return toCumulativeValues(weights);
}
