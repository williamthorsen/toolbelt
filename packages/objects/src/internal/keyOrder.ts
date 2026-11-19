/** Orders two string keys, returning a negative number when `keyA` sorts first. */
export type CompareKeys = (keyA: string, keyB: string) => number;

/**
 * Orders two string keys by code unit, ascending.
 *
 * @internal
 */
export function compareKeysAscending(keyA: string, keyB: string): number {
  return keyA < keyB ? -1 : 1;
}

/**
 * Lists the own enumerable symbol-keyed entries of an object in own-key order.
 *
 * @internal
 */
export function listEnumerableSymbolEntries(value: object): Array<[symbol, unknown]> {
  // Call the prototype's method: A null-prototype object does not inherit it.
  return Object.getOwnPropertySymbols(value)
    .filter((key) => Object.prototype.propertyIsEnumerable.call(value, key))
    .map((key): [symbol, unknown] => [key, Reflect.get(value, key)]);
}
