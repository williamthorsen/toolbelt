/**
 * Returns the first item satisfying the predicate, or throws an `Error` naming what was sought when
 * no item does. The predicate alone decides the match, so an item that satisfies it is returned
 * whatever its value: `0`, `''`, `false`, `null`, and even `undefined` all pass through.
 * Use this function to obtain `T` where a match is guaranteed by construction; where absence is a
 * reachable case, handle the `undefined` from `Array.prototype.find` instead.
 *
 * @category Array
 * @experimental
 * @stage candidate
 *
 * @example
 * findItemOrThrow([1, 2, 3, 4, 5], (num) => num % 2 === 0); // 2
 * findItemOrThrow([1, 2], (num) => num > 10, { label: 'number greater than 10' });
 * // throws Error("Could not find number greater than 10.")
 */
export function findItemOrThrow<T>(
  items: ReadonlyArray<T>,
  predicate: (item: T, index: number, items: ReadonlyArray<T>) => boolean,
  options: Options = {},
): T {
  const { label = 'item' } = options;
  for (const [index, item] of items.entries()) {
    if (predicate(item, index, items)) {
      return item;
    }
  }
  throw new Error(`Could not find ${label}.`);
}

interface Options {
  label?: string | undefined;
}
