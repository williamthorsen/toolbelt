//
/**
 * Type-safe version of `Array.prototype.includes`.
 * Returns `true` if `element` is in `array`.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function includes<T extends readonly unknown[]>(array: T, element: unknown): element is T[number] {
  return array.includes(element);
}
