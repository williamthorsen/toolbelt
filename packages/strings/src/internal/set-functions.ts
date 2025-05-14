// TODO: Move these and other set functions to separate library.

/**
 * Returns the difference of the two sets: set A minus set B.
 */
export function setDifference<T>(minuendElements: Iterable<T>, subtrahendElements: Iterable<T>): Set<T> {
  const subtrahendSet = new Set(subtrahendElements);
  return new Set([...minuendElements].filter((element) => !subtrahendSet.has(element)));
}

/**
 * Returns a set containing the elements that are common to both sets.
 */
export function setIntersection<T>(aIterable: Iterable<T>, bIterable: Iterable<T>): Set<T> {
  const aSet = new Set(aIterable);
  const bSet = new Set(bIterable);
  return new Set([...aSet].filter((element) => bSet.has(element)));
}
