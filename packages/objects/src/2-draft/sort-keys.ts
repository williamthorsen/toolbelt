/* eslint @typescript-eslint/consistent-type-assertions: off */

import { isPlainObject, type PlainObject } from '../4-release/is-object.ts';

/**
 * Returns a new object whose keys are sorted alphabetically or by a custom comparator function.
 *
 * @category Object
 * @experimental
 * @stage draft
 */
export function sortKeys<T extends PlainObject>(
  value: T,
  compare: CompareKeys = (keyA, keyB) => (keyA < keyB ? -1 : 1),
): T {
  if (!isPlainObject(value)) {
    return value;
  }

  const sortedEntries = Object.entries(value)
    .toSorted(([keyA], [keyB]) => compare(keyA, keyB))
    .map(([key, value]) => [key, value]);

  return Object.fromEntries(sortedEntries) as T;
}

/**
 * Returns a copy of the data structure in which the keys of every plain object are sorted, descending into arrays
 * and plain objects; any other value is returned as is. Makes serialized data structures comparable when their
 * keys may differ in order.
 *
 * @category Object
 * @experimental
 * @stage draft
 * @FIXME Disallow objects with non-string keys.
 */
export function sortObjectKeys<T>(value: T, compare: CompareKeys = (keyA, keyB) => (keyA < keyB ? -1 : 1)): T {
  if (Array.isArray(value)) {
    return value.map((item: unknown) => sortObjectKeys(item, compare)) as T;
  }

  if (isPlainObject(value)) {
    const sortedEntries = Object.entries(value)
      .toSorted(([keyA], [keyB]) => compare(keyA, keyB))
      .map(([key, value]) => {
        return [key, sortObjectKeys(value, compare)];
      });

    return Object.fromEntries(sortedEntries) as T;
  }

  return value;
}

type CompareKeys = (keyA: string, keyB: string) => number;
