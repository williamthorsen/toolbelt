import type { Seed } from '@williamthorsen/toolbelt.numbers/candidate';

import { getItemAtIndexOrThrow } from './getItemAtIndexOrThrow.ts';
import { assertValidCumulativeWeights, pickWeightedIndex } from './pickWeightedIndex.ts';
import { toCumulativeValues } from './toCumulativeValues.ts';

/**
 * Returns a function that picks a random item from the array using weighted odds.
 * If the array is empty or the weights are invalid, throws an error.
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

  // Validate here so that every call of the returned function finds an item.
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
