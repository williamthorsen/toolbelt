import { describe, expect, it } from 'vitest';

import { evaluate } from '../evaluate.ts';

describe(evaluate, () => {
  const testObject = {};
  const testArray: unknown[] = [];

  it('returns a non-function value unchanged', () => {
    expect(evaluate(1)).toBe(1);
    expect(evaluate('a')).toBe('a');
    expect(evaluate(testArray)).toBe(testArray);
    expect(evaluate(testObject)).toBe(testObject);
  });

  it('calls a function value and returns its result', () => {
    expect(evaluate(() => 1)).toBe(1);
    expect(evaluate(() => 'a')).toBe('a');
    expect(evaluate(() => testArray)).toBe(testArray);
    expect(evaluate(() => testObject)).toBe(testObject);
  });

  it('passes the remaining arguments to a function value', () => {
    const fn = (a: number, b: number) => a + b;
    expect(evaluate(fn, 1, 2)).toBe(3);
  });
});
