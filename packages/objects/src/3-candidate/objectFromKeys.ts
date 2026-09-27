/**
 * Returns an object keyed by the given keys, whose values are the given value or the results of calling the given
 * function for each key.
 *
 * @category Object
 * @experimental
 * @stage candidate
 */
export function objectFromKeys<K extends string, V>(
  keys: ReadonlyArray<K>,
  valueOrFn: V | ValueFn<K, V>,
): Record<K, V> {
  // eslint-disable-next-line unicorn/no-array-reduce
  return keys.reduce<Record<string, V>>((acc, key, index, array) => {
    // eslint-disable-next-line unicorn/no-instanceof-builtins
    const value = valueOrFn instanceof Function ? valueOrFn(key, index, array) : valueOrFn;
    return {
      ...acc,
      [key]: value,
    };
  }, {});
}

type ValueFn<K, V> = (key: K, index: number, array: ReadonlyArray<K>) => V;
