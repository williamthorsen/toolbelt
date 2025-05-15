import type { Seed } from '@williamthorsen/toolbelt.numbers/candidate';

import { shuffle } from './shuffle.ts';

/**
 * Returns an array with `n` items picked randomly from the given array.
 * Optionally accepts a seed that makes the results deterministic.
 * Optionally accepts an offset that causes the first `offset` items to be omitted from the result
 * (intended for use with a seed, but it does no harm if used alone).
 * TODO: Optionally throw an error if `n` is greater than the length of the array.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function pickItems<T>(items: ReadonlyArray<T>, n: number, options: Options = {}): T[] {
  const { offset = 0, seed } = options;

  const tempItems = shuffle(items, { seed });

  return tempItems.slice(offset, offset + n);
}

interface Options {
  offset?: number | undefined;
  seed?: Seed | undefined;
}
