/**
 * If the value is already an array, returns a copy of the array; otherwise, wraps the value in an array and returns it.
 *
 * @template T - The type of the value or the array elements.
 * @param {T | ReadonlyArray<T>} value - The value to be returned or wrapped in an array.
 * @returns {Array<T>} The value wrapped in an array or the original array.
 *
 * @example
 * arraify(5); // [5]
 * arraify([1, 2, 3]); // [1, 2, 3]
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function arraify<T>(value: T | ReadonlyArray<T>): T[] {
  return value instanceof Array ? [...value] : [value];
}
