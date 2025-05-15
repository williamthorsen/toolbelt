import { isObject } from '../4-release/index.ts';

export function isObjectWithKey1<TValue, TKey extends PropertyKey>(
  value: TValue,
  key: TKey,
): value is Extract<TValue, object> & { [P in TKey]?: unknown } {
  return typeof value === 'object' && value !== null && hasKey(value, key);
}

export function isObjectWithKey2<TValue, TKey extends PropertyKey>(
  value: TValue,
  key: TKey,
): value is Extract<TValue, { [P in TKey]?: unknown }> {
  return typeof value === 'object' && value !== null && key in value;
}

// More generalized approach: Provides uniformity for all types of keys.
export function isObjectWithKey3<T, K extends PropertyKey>(
  target: T,
  key: K,
): target is T extends object ? T & Record<K, K extends keyof T ? T[K] : never> : never {
  if (!target) return false;
  if (typeof target !== 'object' && typeof target !== 'function') return false;

  return key in target;
}

function hasKey<T extends object, K extends PropertyKey>(obj: T, key: K): obj is Extract<T, { [P in K]?: unknown }> {
  return key in obj;
}
