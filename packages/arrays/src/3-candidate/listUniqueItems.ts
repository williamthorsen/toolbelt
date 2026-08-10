/**
 * Returns an array containing the unique items from the input iterable.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function listUniqueItems<T>(items: Iterable<T>): T[] {
  return [...new Set(items)];
}
