/**
 * Returns true if the target has an own property with the key, narrowing the target to a type that has it.
 */
export function hasOwnProperty<T, K extends PropertyKey>(
  target: T,
  key: K,
): target is T & Record<K, K extends keyof T ? T[K] : never> {
  if (!target) return false;
  if (typeof target !== 'object' && typeof target !== 'function') return false;

  return Object.hasOwn(target, key);
}
