import { generateRandom, type Seed } from '@williamthorsen/toolbelt.numbers/candidate';

import { getItemAtIndexOrThrow } from './getItemAtIndexOrThrow.ts';

/**
 * Returns a random item from the array.
 * If the array is empty, throws an error.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function pickItem<T>(items: ReadonlyArray<T>, options: Options = {}): T {
  if (items.length === 0) {
    throw new Error('Cannot pick an item from an empty array.');
  }
  return getItemAtIndexOrThrow(items, Math.floor(generateRandom(options) * items.length));
}

interface Options {
  seed?: Seed | undefined;
}
