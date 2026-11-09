/**
 * Transforms a given function into its curried version.
 *
 * The curried function can be called with one argument at a time, progressively returning new functions until all
 * arguments are provided and the original function is executed. At runtime it also accepts several arguments in one
 * call, but its type exposes one argument per call.
 *
 * @example
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * console.log(curriedAdd(1)(2)); // Outputs: 3
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function curry<TFn extends Func>(fn: TFn): Curry<TFn>;
// TypeScript cannot check a recursive generic return type against a body, so the overload above states the contract.
export function curry(fn: UnknownFn): UnknownFn {
  return function curried(...args: unknown[]): unknown {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return curry(fn.bind(undefined, ...args));
  };
}

// region | Types
type Curry<TFn> = TFn extends (...args: infer Args) => infer Return
  ? Args['length'] extends 1
    ? TFn
    : (arg: Args[0]) => Curry<(...args: Tail<Args>) => Return>
  : never;

type Func = (...args: never[]) => unknown;

type Tail<TArgs extends unknown[]> = TArgs extends [unknown, ...infer Rest] ? Rest : never;

type UnknownFn = (...args: unknown[]) => unknown;
// endregion | Types
