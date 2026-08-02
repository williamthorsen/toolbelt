import { isObject } from '../4-release/is-object.ts';

/**
 * Retrieves a nested value from an object using dot and bracket notation.
 * Only own properties are traversed; inherited members are treated as missing.
 *
 * Examples:
 *   path: 'foo.bar[0].baz'
 *   path: 'users[3].address.street'
 *
 * @param obj - The root object.
 * @param path - Path string supporting dot and bracket notation.
 * @returns The value at the specified path.
 * @throws If any segment is missing or the structure is invalid.
 */
export function getValueAtPathOrThrow(obj: unknown, path: string): unknown {
  if (!isObject(obj)) {
    throw new Error('Expected an object as root value.');
  }

  const keys = path
    .replaceAll(/\[(\w+)]/g, '.$1')
    .split('.')
    .filter(Boolean); // handles cases like leading dots

  let current: unknown = obj;

  for (const key of keys) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isInteger(index)) {
        throw new TypeError(`Expected array index at segment "${key}" in path "${path}"`);
      }
      if (index >= 0 && index < current.length) {
        current = current[index];
      } else {
        throw new Error(`Array index out of bounds: "${key}" in path "${path}"`);
      }
    } else if (isObject(current)) {
      if (!Object.hasOwn(current, key)) {
        throw new Error(`Missing key "${key}" in path "${path}"`);
      }
      current = current[key];
    } else {
      throw new Error(`Unexpected non-object/non-array at segment "${key}" in path "${path}"`);
    }
  }

  return current;
}
