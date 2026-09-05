import { isRecord, isRecordOrArray } from '../4-release/is-object.ts';

/**
 * Returns the value reached by a dot-and-bracket path, throwing where any segment is missing or the structure
 * along the way is neither a record nor an array. Only own properties are traversed; inherited members are
 * treated as missing.
 *
 * ```ts
 * getValueAtPathOrThrow(data, 'foo.bar[0].baz');
 * getValueAtPathOrThrow(data, 'users[3].address.street');
 * ```
 *
 * @category Object
 * @experimental
 * @stage draft
 */
export function getValueAtPathOrThrow(obj: unknown, path: string): unknown {
  if (!isRecordOrArray(obj)) {
    throw new TypeError('Expected an object as root value.');
  }

  const keys = path
    .replaceAll(/\[(\w+)]/g, '.$1')
    .split('.')
    .filter(Boolean); // handles cases like leading dots

  let current: unknown = obj;

  for (const key of keys) {
    if (Array.isArray(current)) {
      const index = Number(key);
      if (!Number.isSafeInteger(index)) {
        throw new TypeError(`Expected array index at segment "${key}" in path "${path}"`);
      }
      if (index >= 0 && index < current.length) {
        current = current[index];
      } else {
        throw new RangeError(`Array index out of bounds: "${key}" in path "${path}"`);
      }
    } else if (isRecord(current)) {
      if (!Object.hasOwn(current, key)) {
        throw new Error(`Missing key "${key}" in path "${path}"`);
      }
      current = current[key];
    } else {
      throw new TypeError(`Unexpected non-object/non-array at segment "${key}" in path "${path}"`);
    }
  }

  return current;
}
