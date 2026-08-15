/**
 * Returns a copy of the value if it is already an array; otherwise wraps it in an array.
 *
 * @category Array
 * @experimental
 * @stage candidate
 *
 * @example
 * arraify(5); // [5]
 * arraify([1, 2, 3]); // [1, 2, 3]
 */
export function arraify<T>(value: T | ReadonlyArray<T>): T[] {
  // eslint-disable-next-line unicorn/no-instanceof-builtins
  return value instanceof Array ? [...value] : [value];
}
