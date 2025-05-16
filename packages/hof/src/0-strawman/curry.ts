/* eslint @typescript-eslint/ban-ts-comment: off */
/* eslint @typescript-eslint/consistent-type-assertions: off */
/* eslint @typescript-eslint/no-explicit-any: off */
/* eslint @typescript-eslint/no-unsafe-argument: off */
// @ts-nocheck - Fix legacy types.

/**
 * Transforms a given function into its curried version.
 *
 * The curried function can be called with one argument at a time, progressively
 * returning new functions until all arguments are provided and the original
 * function is executed. If the curried function receives the full set of
 * arguments all at once, it directly executes and returns the original function's result.
 *
 * @example
 * const add = (a: number, b: number) => a + b;
 * const curriedAdd = curry(add);
 * console.log(curriedAdd(1)(2)); // Outputs: 3
 * console.log(curriedAdd(1, 2)); // Outputs: 3
 *
 * @param {TFn} fn - The function to be curried.
 * @returns {Curry<TFn>} - The curried version of the provided function.
 *
 * @template TFn - The type of the function to be curried. It extends the generic Func type.
 */
export function curry<TFn extends Func>(fn: TFn): Curry<TFn> {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    // eslint-disable-next-line unicorn/no-null
    return curry(fn.bind(null, ...args));
  } as Curry<TFn>;
}

// region | Types
type Func = (...args: any[]) => any;

type Tail<TArgs extends any[]> = ((...args: TArgs) => any) extends (_: any, ...rest: infer Rest) => any ? Rest : never;

type Curry<TFn> = TFn extends (...args: infer Args) => infer Return
  ? Args['length'] extends 1
    ? TFn
    : (arg: Args[0]) => Curry<(...args: Tail<Args>) => Return>
  : never;
// endregion | Types

/*
export function curry<T extends (...args: any[]) => any>(fn: T, argCount = fn.length): Curry<T> {
  return ((...args: unknown[]) => {
    if (args.length >= argCount) {
      return fn(...args);
    }
    return curry(fn.bind(null, ...args), argCount - args.length);
  }) as Curry<T>;
}

export type Curry<T extends (...args: any[]) => any> = Parameters<T> extends
  [first: infer F, second: infer S, ...rest: infer R] ? ((arg: F) => Curry<(input: S, ...rest: R) => ReturnType<T>>)
  : T;
 */
