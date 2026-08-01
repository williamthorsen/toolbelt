/**
 * Converts a Map to a plain object.
 * @param map - The Map to be converted.
 * @returns A plain object with the same key-value pairs as the provided Map.
 */
export function mapToObject<K extends PropertyKey, V>(map: Map<K, V>): Record<K, V> {
  const object: Record<PropertyKey, V> = Object.fromEntries(map);
  return object;
}
