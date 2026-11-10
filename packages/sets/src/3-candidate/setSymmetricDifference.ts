import { toSet } from './conversions.ts';

/**
 * Returns a set containing the elements that are in exactly one of the two collections.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setSymmetricDifference<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  return toSet(aElements).symmetricDifference(toSet(bElements));
}
