/**
 * Returns true if the sets are identical (have the same elements and no others), else false.
 */
export function setsAreEqual<T>(
  aElements: Iterable<T>,
  bElements: Iterable<T>,
): boolean {
  const aSet = new Set(aElements);
  const bSet = new Set(bElements);

  if (aSet.size !== bSet.size) {
    return false;
  }

  for (const element of aSet) {
    if (!bSet.has(element)) {
      return false;
    }
  }

  return true;
}
