import { pickInteger, type Seed, SeededRng } from '@williamthorsen/toolbelt.numbers/candidate';

import { getItemAtIndexOrThrow } from './getItemAtIndexOrThrow.ts';

/**
 * Returns a new array with the items shuffled.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function shuffle<T>(items: ReadonlyArray<T>, options: Options = {}): T[] {
  const shuffled = [...items];
  shuffleInPlace(shuffled, options);
  return shuffled;
}

/**
 * Shuffles the array in place with the Fisher-Yates algorithm, in O(n) time.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function shuffleInPlace(items: unknown[], options: Options = {}): void {
  const seed = SeededRng.spawn(options.seed);

  // Fisher-Yates: Walk backward, swapping each item with a randomly chosen item at or before it.
  for (let i = items.length - 1; i > 0; i--) {
    const j = pickInteger({ max: i, seed });
    const swapped = getItemAtIndexOrThrow(items, i);
    items[i] = getItemAtIndexOrThrow(items, j);
    items[j] = swapped;
  }
}

interface Options {
  seed?: Seed | undefined;
}
