/**
 * Searches for an item in a given list that matches a predicate. If the item is found, it is returned.
 * Otherwise, an error is thrown with a customizable message.
 *
 * Generic Types:
 * T - Type of the items in the provided list.
 *
 * @param items - A readonly list of items to search within.
 * @param predicate - A function to test each item of the list. Return `true` to indicate a match.
 *                    It receives the current item, its index, and the list itself as arguments.
 * @param options - (Optional) Configuration options for the function.
 * @param options.label - (Optional) A label used in the error message to make it more descriptive.
 *                        Defaults to "item".
 *
 * @returns The found item from the list that matches the predicate.
 *
 * @throws Will throw an error if no item matches the predicate with the message "Could not find [label].".
 *
 * @example
 * const numbers = [1, 2, 3, 4, 5];
 * const isEven = (num: number) => num % 2 === 0;
 * findOrThrow(numbers, isEven);  // returns 2
 * findOrThrow(numbers, num => num > 10, { label: 'number greater than 10' });  // throws Error("Could not find number greater than 10.")
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function findOrThrow<T>(
  items: ReadonlyArray<T>,
  predicate: (item: T, index: number, items: ReadonlyArray<T>) => boolean,
  options: FindOrThrowOptions = {},
): NonNullable<T> {
  const { label = 'item' } = options;
  const foundItem = items.find(predicate);
  if (!foundItem) {
    throw new Error(`Could not find ${label}.`);
  }
  return foundItem;
}

interface FindOrThrowOptions {
  label?: string | undefined;
}
