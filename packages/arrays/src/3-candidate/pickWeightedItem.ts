import type { Seed } from '@williamthorsen/toolbelt.numbers/candidate';

import { getItemAtIndexOrThrow } from './getItemAtIndexOrThrow.ts';
import { assertValidCumulativeWeights, pickWeightedIndex } from './pickWeightedIndex.ts';
import { toCumulativeValues } from './toCumulativeValues.ts';

/**
 * Returns a random item from the array using weighted odds.
 * If the array is empty, throws an error.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function pickWeightedItem<T>(
  items: ReadonlyArray<T>,
  weights: ReadonlyArray<number>,
): (options?: PickWeightedItemOptions) => T {
  const cumulativeWeights = toCumulativeValues(weights);

  // By performing this check now, we can guarantee that the returned function always returns a defined value.
  assertValidCumulativeWeights(cumulativeWeights, items.length);

  return function pickItem(options: PickWeightedItemOptions = {}): T {
    const index = pickWeightedIndex(cumulativeWeights, options);
    return getItemAtIndexOrThrow(items, index);
  };
}

export interface PickWeightedItemOptions {
  seed?: Seed | undefined;
}

/** @deprecated Use `pickWeightedItem` instead. */
export const toPickWeightedItem = pickWeightedItem;
