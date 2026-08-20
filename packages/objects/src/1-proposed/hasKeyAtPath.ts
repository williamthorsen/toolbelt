import { isRecordOrArray } from '../4-release/is-object.ts';

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
  if (head === undefined || !isRecordOrArray(obj) || !Object.hasOwn(obj, head)) {
    return false;
  }

  return tail.length === 0 ? true : hasKeyAtPath(Object.getOwnPropertyDescriptor(obj, head)?.value, tail);
}
