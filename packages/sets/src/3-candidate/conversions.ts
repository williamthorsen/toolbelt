/**
 * Returns the input if it is an Array, else returns a new Array containing the contents of the collection.
 */
export function toArray<T>(collection: Iterable<T> | Array<T>): Array<T> {
  return Array.isArray(collection) ? collection : [...collection];
}

/**
 * Returns the input if it is a Set, else returns a new Set containing the contents of the collection.
 */
export function toSet<T>(collection: Iterable<T> | Set<T>): Set<T> {
  return collection instanceof Set ? collection : new Set(collection);
}
