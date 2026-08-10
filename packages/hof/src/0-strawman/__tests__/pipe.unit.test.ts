import { describe, expect, it } from 'vitest';

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

    // Test will fail if TypeScript compilation fails due to type error.
    const result: string = fnPipe(5);

    expect(result).toBe('10');
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

    expect(result).toBe('4');
  });
});

// region | Helpers
async function asyncUpper(s: string): Promise<string> {
  return await Promise.try(() => s.toUpperCase());
}

function double(n: number): number {
  return n * 2;
}

function enclose(s: string): string {
  return `|${s}|`;
}

function sum(addend1: number, addend2: number): number {
  return addend1 + addend2;
}

function toString(s: number): string {
  return s.toString();
}

function upper(str: string): string {
  return str.toUpperCase();
}
// endregion | Helpers
