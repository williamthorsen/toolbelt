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
  return isArrayMember(value) ? [...value] : [value];
}

// region | Helpers

/**
 * Reports whether a union of an item and an array of that item holds the array.
 *
 * `Array.isArray` narrows to `any[]`, which leaves `T` in place on the other branch, so the wrap would widen to
 * the union it was given. The predicate restates the same test at the union's own type.
 */
function isArrayMember<T>(value: T | ReadonlyArray<T>): value is ReadonlyArray<T> {
  return Array.isArray(value);
}

// endregion | Helpers
