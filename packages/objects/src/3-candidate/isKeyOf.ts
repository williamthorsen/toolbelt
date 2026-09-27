/**
 * Returns true if the object has the specified key. Narrows the type.
 *
 * @category Type Guards
 * @experimental
 * @stage candidate
 */
export function isKeyOf<T extends object>(key: PropertyKey, obj: T): key is keyof T {
  return Object.hasOwn(obj, key);
}
