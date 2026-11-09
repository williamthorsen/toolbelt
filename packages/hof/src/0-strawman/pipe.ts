import { isPromise } from './isPromise.ts';

// Adapted from github.com/MathisBullinger/froebel
// Copyright (c) 2020, Mathis Bullinger <mathis@bullinger.dev>
// License: https://github.com/MathisBullinger/froebel/blob/main/LICENSE

/**
 * Successively invokes the functions, passing the result of the previous function as an argument to the next function.
 * If a function returns a promise, the promise will be resolved before its result is passed to the next function.
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function pipe<T extends [Fn, ...Fn[]]>(...fns: PipeReturn<T> extends never ? never : T): PipedFn<T>;
// TypeScript cannot check a variadic generic return type against a body, so the overload above states the contract.
export function pipe(...fns: ReadonlyArray<UnknownFn>): UnknownFn {
  return (...args) => runPipe(fns, args);
}

/**
 * Invokes the pipe of `fns` with the given argument.
 * Unlike in `pipe`, the first function of the pipe must take exactly one argument.
 *
 * @example
 * ```
 * applyPipe(2, double, square, half)  // -> 8
 * ```
 *
 * @category Function
 * @experimental
 * @stage strawman
 */
export function applyPipe<Fns extends [Fn<[never]>, ...Fn[]]>(
  input: Parameters<Fns[0]>[0],
  ...fns: PipeReturn<Fns> extends never ? never : Fns
): PipeReturn<Fns>;
// TypeScript cannot check a variadic generic return type against a body, so the overload above states the contract.
export function applyPipe(input: unknown, ...fns: ReadonlyArray<UnknownFn>): unknown {
  return runPipe(fns, [input]);
}

// region | Helpers
/**
 * Awaits `result` and passes it through the remaining functions, awaiting each result in turn.
 *
 * @internal
 */
async function resolveAsync(result: unknown, fns: ReadonlyArray<UnknownFn>): Promise<unknown> {
  let resolvedResult = await result;
  for (const fn of fns) {
    resolvedResult = await fn(resolvedResult);
  }
  return resolvedResult;
}

/**
 * Calls each function with the previous result, switching to `resolveAsync` at the first thenable result.
 *
 * @internal
 */
function runPipe(fns: ReadonlyArray<UnknownFn>, args: unknown[]): unknown {
  let result: unknown;
  let nextArgs = args;

  for (const [index, fn] of fns.entries()) {
    result = fn(...nextArgs);
    if (isPromise(result)) return resolveAsync(result, fns.slice(index + 1));
    nextArgs = [result];
  }

  return result;
}
// endregion | Helpers

// region | Types
type FnDef = [Return: unknown, Args: unknown[]];

type CheckPipe<F extends Fn[], D extends FnDef[], Async extends boolean = false> = F extends [
  unknown,
  unknown,
  ...unknown[],
]
  ? Resolved<D[0][1]> extends Parameters<Head<F>>
    ? CheckPipe<
        F extends [unknown, ...infer F_] ? (F_ extends Fn[] ? F_ : never) : never,
        D extends [unknown, ...infer D_] ? (D_ extends FnDef[] ? D_ : never) : never,
        Async extends true ? true : ReturnType<Head<F>> extends Promise<unknown> ? true : false
      >
    : never
  : Resolved<D[0][1]> extends Parameters<Head<F>>
    ? Async extends true
      ? MakePromise<ReturnType<Head<F>>>
      : ReturnType<Head<F>>
    : never;

type CarryReturn<Returns extends unknown[], Args extends unknown[]> = Returns extends [infer A, ...infer B]
  ? [[A, Args], ...CarryReturn<B, [A]>]
  : [];

type Fn<TA extends never[] = never[], TR = unknown> = (...args: TA) => TR;

type Head<F extends Fn[]> = F extends [infer H extends Fn, ...Fn[]] ? H : never;

type MakePromise<T> = Promise<T extends PromiseLike<infer I> ? I : T>;

type PipedFn<T extends Fn[]> = PipeReturn<T> extends never ? never : (...args: Parameters<Head<T>>) => PipeReturn<T>;

type PipeReturn<F extends Fn[]> = CheckPipe<F, CarryReturn<ReturnTypes<F>, Parameters<Head<F>>>>;

type Resolved<T> = {
  [K in keyof T]: T[K] extends Promise<infer I> ? I : T[K];
};

type ReturnTypes<T extends Fn[]> = {
  [K in keyof T]: ReturnType<T[K]>;
};

type UnknownFn = (...args: unknown[]) => unknown;
// endregion | Types
