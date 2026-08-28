import { isRecordOrArray } from '../4-release/is-object.ts';

/**
 * Returns true if the keys name a path of own properties reaching an existing key. An empty path, or a missing
 * segment anywhere along it, returns false rather than throwing.
 *
 * @category Object
 * @experimental
 * @stage proposed
 */
export function hasKeyAtPath(obj: unknown, keys: readonly string[]): boolean {
  const [head, ...tail] = keys;
  if (head === undefined || !isRecordOrArray(obj) || !Object.hasOwn(obj, head)) {
    return false;
  }

  return tail.length === 0 ? true : hasKeyAtPath(Object.getOwnPropertyDescriptor(obj, head)?.value, tail);
}
