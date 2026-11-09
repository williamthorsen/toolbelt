import { describe, expect, expectTypeOf, it } from 'vitest';

import { applyPipe, pipe } from '../pipe.ts';

describe(pipe, () => {
  it('correctly composes multiple functions together', () => {
    const fnPipe = pipe(double, toString, enclose);
    const expected = '|4|';

    const actual = fnPipe(2);

    expect(actual).toBe(expected);
  });

  it('works with a single function', () => {
    const fnPipe = pipe(double);

    expect(fnPipe(3)).toBe(6);
  });

  it('correctly types the returned function', () => {
    const fnPipe = pipe(double, toString);

    expectTypeOf(fnPipe).toEqualTypeOf<(n: number) => string>();
    expect(fnPipe(5)).toBe('10');
  });

  it('types a pipe containing an async function as returning a promise', () => {
    expectTypeOf(pipe(asyncUpper, enclose)).returns.toEqualTypeOf<Promise<string>>();
  });

  it('passes the resolved value of a non-Promise thenable to the next function', async () => {
    const fnPipe = pipe(thenableDouble, toString);

    expectTypeOf(fnPipe).returns.toEqualTypeOf<Promise<string>>();
    await expect(fnPipe(2)).resolves.toBe('4');
  });

  it('types a pipe ending in a non-Promise thenable as returning a promise', async () => {
    const fnPipe = pipe(double, thenableDouble);

    expectTypeOf(fnPipe).returns.toEqualTypeOf<Promise<number>>();
    await expect(fnPipe(2)).resolves.toBe(8);
  });

  it('accepts a first function that requires more than one argument', () => {
    const fnPipe = pipe(sum, double);
    const expected = (1 + 2) * 2;

    const actual = fnPipe(1, 2);

    expect(actual).toBe(expected);
  });

  it('resolves an async function', async () => {
    const fnPipe = pipe(asyncUpper, enclose);

    await expect(fnPipe('hello')).resolves.toBe('|HELLO|');
  });

  // TODO: Consider whether to add runtime checks for these cases.
  it('throws compilation errors', () => {
    expect(() => {
      // @ts-expect-error - Cannot be called with no arguments
      pipe();
    }).not.toThrow();
    expect(() => {
      // @ts-expect-error - Functions after the first must take exactly one argument
      pipe(double, sum);
    }).not.toThrow();
    expect(() => {
      // @ts-expect-error - Cannot pipe a number into a function that expects a string
      pipe(sum, upper);
    }).not.toThrow();
  });
});

describe(applyPipe, () => {
  it('applies the first argument to the first function in the pipe', () => {
    const result = applyPipe(2, double, toString);

    expectTypeOf(result).toEqualTypeOf<string>();
    expect(result).toBe('4');
  });
});

// region | Helpers
/** Upper-cases a string asynchronously. */
async function asyncUpper(s: string): Promise<string> {
  return await Promise.try(() => s.toUpperCase());
}

/** Doubles a number. */
function double(n: number): number {
  return n * 2;
}

/** Encloses a string in pipe characters. */
function enclose(s: string): string {
  return `|${s}|`;
}

/** Adds two numbers. */
function sum(addend1: number, addend2: number): number {
  return addend1 + addend2;
}

/** Doubles a number and returns it through a thenable that is not a Promise. */
function thenableDouble(n: number): PromiseLike<number> {
  const promise = Promise.resolve(n * 2);
  return { then: promise.then.bind(promise) };
}

/** Converts a number to a string. */
function toString(s: number): string {
  return s.toString();
}

/** Upper-cases a string. */
function upper(str: string): string {
  return str.toUpperCase();
}
// endregion | Helpers
