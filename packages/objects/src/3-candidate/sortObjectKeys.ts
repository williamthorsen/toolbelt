import { isPlainObject } from '../4-release/is-object.ts';
import { type CompareKeys, compareKeysAscending, listEnumerableSymbolEntries } from '../internal/keyOrder.ts';

/**
 * Returns a copy of the data structure in which the string keys of every plain object are sorted and followed by its
 * enumerable symbol keys in their original order, descending into arrays and into the values of plain objects; any
 * other value is returned as is. Makes serialized data structures comparable when their keys may differ in order.
 *
 * @category Object
 * @experimental
 * @stage candidate
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
