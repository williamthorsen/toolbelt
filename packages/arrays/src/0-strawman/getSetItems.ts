/**
 * Returns an array of the items in the set of values in the iterable.
 *
 * @category Array
 * @experimental
 * @stage strawman
 */
export function getSetItems<T>(iterable: Iterable<T>): T[] {
  return [...new Set(iterable)];
}
