/**
 * Converts a Map to a plain object with the same key-value pairs.
 *
 * @category Object
 * @experimental
 * @stage candidate
 */
export function mapToObject<K extends PropertyKey, V>(map: Map<K, V>): Record<K, V> {
  const object: Record<PropertyKey, V> = Object.fromEntries(map);
  return object;
}
