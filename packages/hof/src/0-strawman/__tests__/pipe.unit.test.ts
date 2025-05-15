import { assertEquals, describe, it } from '../../dev_deps.ts';
import { applyPipe, pipe } from '../pipe.ts';

const double = (n: number) => n * 2;
const sum = (addend1: number, addend2: number) => addend1 + addend2;
const enclose = (s: string) => `|${s}|`;

const toString = (s: number) => s.toString();
const upper = (str: string) => str.toUpperCase();
const asyncUpper = async (s: string) => await new Promise<string>((resolve) => resolve(s.toUpperCase()));

describe('pipe()', () => {
  it('correctly composes multiple functions together', () => {
    const fnPipe = pipe(double, toString, enclose);
    const expected = '|4|';

    const actual = fnPipe(2);

    assertEquals(actual, expected);
  });

  it('works with a single function', () => {
    const fnPipe = pipe(double);

    assertEquals(fnPipe(3), 6);
  });

  it('correctly types the returned function', () => {
    const fnPipe = pipe(double, toString);

    // Test will fail if TypeScript compilation fails due to type error.
    const result: string = fnPipe(5);

    assertEquals(result, '10');
  });

  it('accepts a first function that requires more than one argument', () => {
    const fnPipe = pipe(sum, double);
    const expected = (1 + 2) * 2;

    const actual = fnPipe(1, 2);

    assertEquals(actual, expected);
  });

  it('resolves an async function', () => {
    const fnPipe = pipe(asyncUpper, enclose);

    return fnPipe('hello').then((result) => {
      assertEquals(result, '|HELLO|');
    });
  });

  it('throws compilation errors', () => {
    // @ts-expect-error - Cannot be called with no arguments
    pipe();
    // @ts-expect-error - Functions after the first must take exactly one argument
    pipe(double, sum);
    // @ts-expect-error - Cannot pipe a number into a function that expects a string
    pipe(sum, upper);
  });
});

describe('applyPipe()', () => {
  it('applies the first argument to the first function in the pipe', () => {
    const result = applyPipe(2, double, toString);

    assertEquals(result, '4');
  });
});
