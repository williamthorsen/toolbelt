/**
 * Returns a set containing the elements of the first collection that are absent from the second.
 */
export function setDifference<T>(aElements: Iterable<T>, bElements: Iterable<T>): Set<T> {
  const bSet = new Set(bElements);
  const differenceSet = new Set<T>();

  for (const element of aElements) {
    if (!bSet.has(element)) {
      differenceSet.add(element);
    }
  }

  return differenceSet;
}
