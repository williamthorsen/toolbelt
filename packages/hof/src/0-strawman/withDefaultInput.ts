/**
 * Returns a new function that replaces undefined input to the original function with a default value.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function withDefaultInput<TInput, TReturn>(
  fn: (value: TInput) => TReturn,
  defaultValue: NoInfer<TInput>,
): (value: TInput | undefined) => TReturn {
  return function withDefault(value: TInput | undefined): TReturn {
    return fn(value === undefined ? defaultValue : value);
  };
}
