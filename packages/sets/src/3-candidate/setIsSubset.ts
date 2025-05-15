/**
 * Returns true if all elements in childElements are in parentElements, else false.
 */
export function setIsSubset<T>(
  childElements: Iterable<T>,
  parentElements: Iterable<T>,
): boolean {
  const parentSet = new Set(parentElements);

  for (const element of childElements) {
    if (!parentSet.has(element)) {
      return false;
    }
  }

  return true;
}
