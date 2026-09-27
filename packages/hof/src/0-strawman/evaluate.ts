/**
 * Returns the result of calling `value` with `args` where `value` is a function, and `value` itself otherwise.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function evaluate<T, TArgs extends unknown[]>(value: T | ((...args: TArgs) => T), ...args: TArgs): T {
  // eslint-disable-next-line unicorn/no-instanceof-builtins
  return value instanceof Function ? value(...args) : value;
}
