/**
 * Returns a function that calls `fn` with each undefined item of its input array replaced by `defaultValue`.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function withDefaultItemValue<TItem, TReturn>(
  fn: (values: ReadonlyArray<TItem>) => TReturn,
  defaultValue: TItem,
): (values: ReadonlyArray<TItem | undefined>) => TReturn {
  return function withDefault(values: ReadonlyArray<TItem | undefined>): TReturn {
    return fn(values.map((value) => value ?? defaultValue));
  };
}
