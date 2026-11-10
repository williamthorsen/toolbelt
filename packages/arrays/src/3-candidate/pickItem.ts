import { pickInteger, type SeedOptions } from '@williamthorsen/toolbelt.numbers/candidate';

import { getItemAtIndexOrThrow } from './getItemAtIndexOrThrow.ts';

/**
 * Returns a random item from the array.
 * If the array is empty, throws a `RangeError`.
 * Draws exactly once per call, even for a one-item array.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function pickItem<T>(items: ReadonlyArray<T>, options: SeedOptions = {}): T {
  if (items.length === 0) {
    throw new RangeError('Cannot pick an item from an empty array.');
  }
  return getItemAtIndexOrThrow(items, pickInteger({ max: items.length - 1, seed: options.seed }));
}
