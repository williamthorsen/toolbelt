import { toSet } from './conversions.ts';

/**
 * Returns a set containing the elements that are common to both collections. The result's iteration order is
 * unspecified.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setIntersection<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  return toSet(aElements).intersection(toSet(bElements));
}
