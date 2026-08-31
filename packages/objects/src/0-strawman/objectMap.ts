import { type NoNumericKeys, TypedObject } from './TypedObject.v1.ts';

/**
 * Returns a new object with the same keys as the input object, but with values transformed by the predicate.
 * For use only with object literals & class instances that have only string keys.
 * An object with numeric keys is rejected at compile time (although it would succeed at runtime).
 * Any other object will not be detected at compile time but will cause a runtime error.
 *
 * @source Soulforge
 *
 * @category Object
 * @experimental
 * @stage strawman
 *
 */
export function objectMap<K extends string, V, N>(
  obj: NoNumericKeys<Record<K, V>>,
  predicate: (value: V, key: K) => N,
): Record<K, N> {
  const newEntries = TypedObject.entries(obj).map(([key, value]): [K, N] => [key, predicate(value, key)]);
  return TypedObject.fromEntries(newEntries);
}
