/**
 * Returns an array containing the items from the input iterable that are duplicated.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function getUniqueItems<T>(items: Iterable<T>): T[] {
  return [...new Set(items)];
}
