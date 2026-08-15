/**
 * Returns the item at the index, resolving a negative index from the end as `Array.prototype.at` does.
 * Throws a `RangeError` if the index names no value, and a `TypeError` if it is not a safe integer.
 * Use this function to avoid the need for type assertions when `noUncheckedIndexedAccess` is enabled.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function getItemAtIndexOrThrow<T>(array: ReadonlyArray<T>, index: number): T {
  if (!Number.isSafeInteger(index)) {
    throw new TypeError(`Index must be a safe integer, but received ${index}.`);
  }

  const item = array.at(index);
  if (item === undefined) {
    throw new RangeError(`No value at index ${index} of an array of length ${array.length}.`);
  }

  return item;
}
