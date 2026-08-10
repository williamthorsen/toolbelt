/**
 * Returns true if `value` looks like a promise. Does not guarantee that `value` is a Promise.
 *
 * @example
 * ```
 * async (value: number | Promise<number>) => {
 *   if (isPromise(value)) return (await value) / 2;
 *   else return value / 2;
 * }
 * ```
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function isPromise<T>(value: unknown): value is Promise<T> {
  if (value === null || typeof value !== 'object') return false;
  return 'then' in value && typeof value.then === 'function';
}

/**
 * Returns true if `value` is not a promise.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function isNotPromise<T>(value: T): value is Exclude<T, Promise<unknown>> {
  return !isPromise(value);
}
