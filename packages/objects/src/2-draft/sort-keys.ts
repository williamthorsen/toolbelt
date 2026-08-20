/* eslint @typescript-eslint/consistent-type-assertions: off */

import { isPlainObject, type PlainObject } from '../4-release/is-object.ts';

/**
 * Returns a new object whose keys are sorted alphabetically or by a custom comparator function.
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
 * Recursively sorts the keys in all objects in the given data structure.
 * If the input is an object, returns a new object whose keys are the sorted keys of the input object and whose
 * values are the results of calling this function on the input object's values.
 * If the input is an array, returns a new array whose elements are the results of calling this function on the
 * input array's elements.
 * Otherwise, returns the input.
 *
 * @FIXME Disallow objects with non-string keys.
 *
 * The use case for this function is to allow comparison of serialized data structures that are expected to be
 * equivalent but whose keys may be in a different order.
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
