/**
 * Returns the element at the index, or throws an error if the index is out of bounds or the element is undefined.
 * Use this function to avoid the need for type assertions when `noUncheckedIndexedAccess` is enabled.
 */
export function itemAt<T>(array: ReadonlyArray<T>, index: number): T {
  if (index < 0 || index >= array.length) {
    throw new RangeError(`Index ${index} is out of bounds.`);
  }

  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return array[index] as T;
}
