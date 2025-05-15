import { random, type Seed, SeededRng } from '@williamthorsen/toolbelt.numbers/candidate';

import { itemAt } from './itemAt.ts';

/**
 * Returns a new array with the items shuffled.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function shuffle<T>(items: ReadonlyArray<T>, options: Options = {}): T[] {
  const tempItems = [...items];
  shuffleInPlace(tempItems, options);
  return tempItems;
}

/**
 * Uses the Fisher-Yates algorithm to shuffle an array in place.
 * Time complexity: O(n)
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function shuffleInPlace(items: unknown[], options: Options = {}): void {
  const seed = SeededRng.spawn(options.seed);

  // Fisher-Yates algorithm
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(random({ seed }) * (i + 1));
    [items[i], items[j]] = [itemAt(items, j), itemAt(items, i)];
  }
}

interface Options {
  seed?: Seed | undefined;
}
