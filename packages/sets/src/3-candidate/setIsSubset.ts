import { toSet } from './conversions.ts';

/**
 * Returns true if all elements in childElements are in parentElements, else false.
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

export function setIsSuperset<T>(parentElements: Iterable<T>, childElements: Iterable<T>): boolean {
  return setIsSubset(childElements, parentElements);
}
