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
