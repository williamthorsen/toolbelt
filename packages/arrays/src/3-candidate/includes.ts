/**
 * Reports whether `element` is in `array`, narrowing it to the array's item type.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function includes<T extends readonly unknown[]>(array: T, element: unknown): element is T[number] {
  return array.includes(element);
}
