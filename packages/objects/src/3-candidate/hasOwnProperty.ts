/**
 * Type-safe replacement for `Object.prototype.hasOwnProperty.call(target, property)`
 */
export function hasOwnProperty<T, K extends PropertyKey>(
  target: T,
  key: K,
): target is T & Record<K, K extends keyof T ? T[K] : never> {
  if (!target) return false;
  if (typeof target !== 'object' && typeof target !== 'function') return false;

  return Object.hasOwn(target, key);
}
