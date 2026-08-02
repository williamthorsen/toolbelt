import { pickInteger, type Seed, SeededRng } from '@williamthorsen/toolbelt.numbers/candidate';

import { getAtIndexOrThrow } from './getAtIndexOrThrow.ts';

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
 * Uses the Fisher-Yates algorithm to shuffle an array in place.
 * Time complexity: O(n)
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function shuffleInPlace<T>(items: T[], options: Options = {}): void {
  const seed = SeededRng.spawn(options.seed);

  // Fisher-Yates: walk backward, swapping each item with a randomly chosen item at or before it.
  for (let i = items.length - 1; i > 0; i--) {
    const j = pickInteger({ max: i, seed });
    const swapped = getAtIndexOrThrow(items, i);
    items[i] = getAtIndexOrThrow(items, j);
    items[j] = swapped;
  }
}

interface Options {
  seed?: Seed | undefined;
}
