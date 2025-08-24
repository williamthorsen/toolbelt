/**
 * Returns true if the object has the specified key. Narrows the type.
 */
export function isKeyOf<T extends object>(key: PropertyKey, obj: T): key is keyof T {
  return Object.hasOwn(obj, key);
}
