/**
 * Returns a function that returns the value mapped to a key.
 * If a default value is provided, the returned function will return the default value if the key is undefined.
 */
export function get<TKey extends string>(
  prop: TKey,
): <TObj extends Partial<Record<TKey, unknown>>>(obj: TObj) => TObj[TKey];
export function get<TKey extends string, TDefault>(
  prop: TKey,
  defaultValue: TDefault,
): <TObj extends Partial<Record<TKey, TDefault | undefined>>>(value: TObj) => TDefault;
export function get<TKey extends string, TDefault>(prop: TKey, defaultValue?: TDefault) {
  return function <TObj extends Partial<Record<TKey, TDefault | undefined>>>(value: TObj) {
    const val = value[prop];
    return val === undefined ? defaultValue : val;
  };
}
