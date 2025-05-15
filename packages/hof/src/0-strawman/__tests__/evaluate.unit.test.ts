import { describe, expect, it } from 'vitest';

import { evaluate } from '../evaluate.ts';

describe(evaluate, () => {
  const testObject = {};
  const testArray: unknown[] = [];

  it('should return the value if it is not a function', () => {
    expect(evaluate(1)).toBe(1);
    expect(evaluate('a')).toBe('a');
    expect(evaluate(testArray)).toBe(testArray);
    expect(evaluate(testObject)).toBe(testObject);
  });

  it('should call the function and return the result if the value is a function', () => {
    expect(evaluate(() => 1)).toBe(1);
    expect(evaluate(() => 'a')).toBe('a');
    expect(evaluate(() => testArray)).toBe(testArray);
    expect(evaluate(() => testObject)).toBe(testObject);
  });

  it('can pass arguments to the function', () => {
    const fn = (a: number, b: number) => a + b;
    expect(evaluate(fn, 1, 2)).toBe(3);
  });
});
