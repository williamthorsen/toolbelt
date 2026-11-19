import { isPlainObject, type PlainObject } from '../4-release/is-object.ts';
import { type CompareKeys, compareKeysAscending, listEnumerableSymbolEntries } from '../internal/keyOrder.ts';

/**
 * Returns a new object whose string keys are sorted alphabetically or by a custom comparator function, followed by
 * its enumerable symbol keys in their original order.
 *
 * @category Object
 * @experimental
 * @stage draft
 */
export function sortKeys<T extends PlainObject>(value: T, compare: CompareKeys = compareKeysAscending): T {
  if (!isPlainObject(value)) {
    return value;
  }

  const sortedEntries = Object.entries(value).toSorted(([keyA], [keyB]) => compare(keyA, keyB));

  // The copy holds every own enumerable property of `value`, string- and symbol-keyed, with its value unchanged,
  // which TypeScript cannot infer from `Object.fromEntries`.
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return Object.fromEntries([...sortedEntries, ...listEnumerableSymbolEntries(value)]) as T;
}

/**
 * Returns a copy of the data structure in which the string keys of every plain object are sorted and followed by its
 * enumerable symbol keys in their original order, descending into arrays and into the values of plain objects; any
 * other value is returned as is. Makes serialized data structures comparable when their keys may differ in order.
 *
 * @category Object
 * @experimental
 * @stage draft
 */
export function sortObjectKeys<T>(value: T, compare: CompareKeys = compareKeysAscending): T {
  if (Array.isArray(value)) {
    // The copy keeps every element, each replaced by a sorted copy of the same type.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return value.map((item: unknown) => sortObjectKeys(item, compare)) as T;
  }

  if (isPlainObject(value)) {
    const sortedEntries = Object.entries(value).toSorted(([keyA], [keyB]) => compare(keyA, keyB));
    const entries = [...sortedEntries, ...listEnumerableSymbolEntries(value)].map(
      ([key, propertyValue]): [PropertyKey, unknown] => [key, sortObjectKeys(propertyValue, compare)],
    );

    // The copy holds every own enumerable property of `value`, string- and symbol-keyed, each value replaced by a
    // sorted copy of the same type, which TypeScript cannot infer from `Object.fromEntries`.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return Object.fromEntries(entries) as T;
  }

  return value;
}
