/**
 * Returns true if `value` is a thenable: a non-null object with a `then` method. A thenable is not necessarily a
 * `Promise`.
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
export function isPromise(value: unknown): value is PromiseLike<unknown> {
  if (value === null || typeof value !== 'object') return false;
  return 'then' in value && typeof value.then === 'function';
}

/**
 * Returns true if `value` is not a thenable.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function isNotPromise<T>(value: T): value is Exclude<T, PromiseLike<unknown>> {
  return !isPromise(value);
}
