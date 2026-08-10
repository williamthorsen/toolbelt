/**
 * Returns a new function that replaces undefined input to the original function with a default value.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function withDefaultInput<TInput, TReturn>(
  fn: (value: TInput) => TReturn,
  defaultValue: TInput,
): (value: TInput | undefined) => TReturn {
  if (fn.length === 0) {
    throw new Error('Invalid input. The function must have one parameter.');
  }

  return function withDefault(value: TInput | undefined): TReturn {
    return fn(value ?? defaultValue);
  };
}
