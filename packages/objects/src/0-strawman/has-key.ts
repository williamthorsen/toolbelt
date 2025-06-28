import { isObject } from '../4-release/is-object.ts';

export function isObjectWithKey1<TValue, TKey extends PropertyKey>(
  value: TValue,
  key: TKey,
): value is Extract<TValue, object> & { [P in TKey]?: unknown } {
  return typeof value === 'object' && value !== null && hasKey(value, key);
}

export function isObjectWithKey2<TValue, TKey extends PropertyKey>(
  value: TValue,
  key: TKey,
): value is Extract<TValue, { [P in TKey]?: unknown }> {
  return typeof value === 'object' && value !== null && key in value;
}

// More generalized approach: Provides uniformity for all types of keys.
export function isObjectWithKey3<T, K extends PropertyKey>(
  target: T,
  key: K,
): target is T extends object ? T & Record<K, K extends keyof T ? T[K] : never> : never {
  if (!target) return false;
  if (typeof target !== 'object' && typeof target !== 'function') return false;

  return key in target;
}

/**
 * @TODO Compare this with the `hasOwnProperty` function in this library.
 */
function hasKey<T extends object, K extends PropertyKey>(obj: T, key: K): obj is Extract<T, { [P in K]?: unknown }> {
  return key in obj;
}

/**
 * Checks whether a nested key exists within an object.
 *
 * Traverses the object using all but the last key in the `keys` array,
 * and then checks if the final key exists in the resulting object.
 * If any part of the path is missing, returns false without throwing.
 *
 * @param {object} obj - The root object to search in.
 * @param {string[]} keys - Array of keys representing the path to check.
 * @returns {boolean} True if the nested key exists, false otherwise.
 */
export function hasKeyAtPath(obj: unknown, keys: readonly string[]): boolean {
  const [head, ...tail] = keys;
  if (!isObject(obj) || head === undefined || !Object.hasOwn(obj, head)) {
    return false;
  }

  return tail.length === 0 ? true : hasKeyAtPath(Object.getOwnPropertyDescriptor(obj, head)?.value, tail);
}
