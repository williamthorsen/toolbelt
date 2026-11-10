import { toSet } from './conversions.ts';

/**
 * Returns a set containing all elements from both collections.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setUnion<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  return toSet(aElements).union(toSet(bElements));
}
