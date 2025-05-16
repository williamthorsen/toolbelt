/* eslint @typescript-eslint/ban-ts-comment: off */
/* eslint @typescript-eslint/consistent-type-assertions: off */
/* eslint @typescript-eslint/no-explicit-any: off */
/* eslint @typescript-eslint/no-unsafe-assignment: off */
/* eslint @typescript-eslint/no-unsafe-call: off */
/* eslint @typescript-eslint/no-unsafe-return: off */
// @ts-nocheck - Fix legacy types.

import { getAtIndexOrThrow } from '@williamthorsen/toolbelt.arrays/candidate';

import { isPromise } from './isPromise.ts';

// Adapted from github.com/MathisBullinger/froebel
// Copyright (c) 2020, Mathis Bullinger <mathis@bullinger.dev>
// License: https://github.com/MathisBullinger/froebel/blob/main/LICENSE

/**
 * Successively invokes the functions, passing the result of the previous function as an argument to the next function.
 * If a function returns a promise, the promise will be resolved before its result is passed to the next function.
 */
export function pipe<T extends [Fn, ...Fn[]]>(...fns: PipeReturn<T> extends never ? never : T): PipedFn<T> {
  return ((...args) => {
    let nextArgs: unknown[] = args;

    for (let i = 0; i < fns.length; i++) {
      const [result] = (nextArgs = [getAtIndexOrThrow(fns, i)(...nextArgs)]);
      if (isPromise(result)) return resolveAsync(result, fns.slice(i + 1));
    }

    return nextArgs[0];
  }) as PipedFn<T>;
}

/**
 * Like `pipe` but takes an argument as its first parameter and invokes the pipe with it.
 * Note: unlike in `pipe`, the first function of the pipe must take exactly one argument.
 *
 * @example
 * ```
 * applyPipe(2, double, square, half)  // -> 8
 * ```
 */
export function applyPipe<Fns extends [Fn<[any]>, ...Fn[]]>(
  Fn: Parameters<Fns[0]>[0],
  ...fns: PipeReturn<Fns> extends never ? never : Fns
): PipeReturn<Fns> {
  return (pipe(...fns) as any)(Fn);
}

// region | Helpers
/**
 * @internal
 */
async function resolveAsync(result: unknown, fns: Fn[]) {
  let resolvedResult = result;
  for (const fn of fns) {
    resolvedResult = fn(await resolvedResult);
  }
  return await resolvedResult;
}
// endregion | Helpers

// region | Types
type FnDef = [Return: any, Args: any[]];

type CheckPipe<F extends Fn[], D extends FnDef[], Async extends boolean = false> = F extends [any, any, ...any[]]
  ? Resolved<D[0][1]> extends Parameters<F[0]>
    ? CheckPipe<
        F extends [any, ...infer F_] ? (F_ extends Fn[] ? F_ : never) : never,
        D extends [any, ...infer D_] ? (D_ extends FnDef[] ? D_ : never) : never,
        Async extends true ? true : ReturnType<F[0]> extends Promise<unknown> ? true : false
      >
    : never
  : Resolved<D[0][1]> extends Parameters<F[0]>
    ? Async extends true
      ? MakePromise<ReturnType<F[0]>>
      : ReturnType<F[0]>
    : never;

type CarryReturn<Returns extends any[], Args extends any[]> = Returns extends [infer A, ...infer B]
  ? [[A, Args], ...CarryReturn<B, [A]>]
  : [];

type Fn<TA extends any[] = any[], TR = any> = (...args: TA) => TR;

type MakePromise<T> = Promise<T extends PromiseLike<infer I> ? I : T>;

type PipedFn<T extends Fn[]> = PipeReturn<T> extends never ? never : (...args: Parameters<T[0]>) => PipeReturn<T>;

type PipeReturn<F extends Fn[]> = CheckPipe<F, CarryReturn<ReturnTypes<F>, Parameters<F[0]>>>;

type Resolved<T> = {
  [K in keyof T]: T[K] extends Promise<infer I> ? I : T[K];
};

type ReturnTypes<T extends Fn[]> = {
  [K in keyof T]: ReturnType<T[K]>;
};
// endregion | Types
