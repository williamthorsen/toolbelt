import { toSet } from './conversions.ts';

/**
 * Returns true if the sets are identical (have the same elements and no others), else false.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setsAreEqual<T>(aElements: Iterable<T>, bElements: Iterable<T>): boolean {
  const aSet = toSet(aElements);
  const bSet = toSet(bElements);

  return aSet.size === bSet.size && aSet.isSubsetOf(bSet);
}
