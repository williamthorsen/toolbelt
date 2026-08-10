/**
 * If the given value is a function, it is called (optionally with arguments) and the result is returned.
 * Otherwise, the value is returned as is.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function evaluate<T, TArgs extends unknown[]>(value: T | ((...args: TArgs) => T), ...args: TArgs): T {
  // eslint-disable-next-line unicorn/no-instanceof-builtins
  return value instanceof Function ? value(...args) : value;
}
