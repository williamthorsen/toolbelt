/**
 * Returns the symmetric difference of the two sets.
 * Source: `skypilot-dev/sugarbowl`
 */
export function setSymmetricDifference<T>(
  aElements: Iterable<T>,
  bElements: Iterable<T>,
): Set<T> {
  const aSet = new Set(aElements);
  const bSet = new Set(bElements);
  const symmetricDifference = new Set<T>();

  for (const element of aSet) {
    if (!bSet.has(element)) {
      symmetricDifference.add(element);
    }
  }

  for (const element of bSet) {
    if (!aSet.has(element)) {
      symmetricDifference.add(element);
    }
  }

  return symmetricDifference;
}
