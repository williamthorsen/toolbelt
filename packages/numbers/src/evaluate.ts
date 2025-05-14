export type FunctionOrValue<T> = T | (() => T);

function isFunction(value: unknown): value is () => unknown {
  return typeof value === 'function';
}

export function evaluate<T>(input: FunctionOrValue<T>): T {
  return isFunction(input) ? input() : input;
}
