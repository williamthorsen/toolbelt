import { toSet } from './conversions.ts';

/**
 * Returns a set containing the elements of the first collection that are absent from the second.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setDifference<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  return toSet(aElements).difference(toSet(bElements));
}
