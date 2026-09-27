import { toSet } from './conversions.ts';

/**
 * Returns true if all elements in childElements are in parentElements, else false.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setIsSubset<T>(childElements: Iterable<T>, parentElements: Iterable<T>): boolean {
  const parentSet = toSet(parentElements);

  for (const element of childElements) {
    if (!parentSet.has(element)) {
      return false;
    }
  }

  return true;
}

/**
 * Returns true if all elements in childElements are in parentElements, else false.
 *
 * @category Set
 * @experimental
 * @stage candidate
 */
export function setIsSuperset<T>(parentElements: Iterable<T>, childElements: Iterable<T>): boolean {
  return setIsSubset(childElements, parentElements);
}
