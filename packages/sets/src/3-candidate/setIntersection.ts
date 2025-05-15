/**
 * Returns a set containing the elements that are common to both sets.
 */
export function setIntersection<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  const setB = new Set(bElements);
  const intersection = new Set<T>();

  for (const element of aElements) {
    if (setB.has(element)) {
      intersection.add(element);
    }
  }

  return intersection;
}
