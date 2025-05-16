/**
 * Returns a set containing all elements from both collections.
 */
export function setUnion<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  const unionSet = new Set<T>(aElements);

  for (const element of bElements) {
    unionSet.add(element);
  }

  return unionSet;
}
