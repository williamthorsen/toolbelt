/**
 * Returns the item at the index, or throws: a `RangeError` if the array has no item there, and a
 * `TypeError` if the index is not a safe integer. This function tests presence, so an item whose
 * value is `undefined` is returned, not thrown on; "no item" means an index that is negative,
 * past the end, or on a hole in a sparse array.
 * Use this function to obtain `T` without a type assertion under `noUncheckedIndexedAccess` where
 * the index is guaranteed by construction; where absence is a reachable case, handle the
 * `undefined` from `Array.prototype.at` instead.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function getItemAtIndexOrThrow<T>(array: ReadonlyArray<T>, index: number): T {
  if (!Number.isSafeInteger(index)) {
    throw new TypeError(`Index must be a safe integer, but received ${index}.`);
  }

  if (!Object.hasOwn(array, index)) {
    throw new RangeError(`No item at index ${index} of an array of length ${array.length}.`);
  }

  // `Object.hasOwn` proves an element is present at the index, but TypeScript cannot infer this:
  // The `undefined` that `noUncheckedIndexedAccess` adds models possible absence, and no check on
  // the array (as opposed to the read value) narrows it away.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- guaranteed by the presence check above, but uninferable
  return array[index] as T;
}
