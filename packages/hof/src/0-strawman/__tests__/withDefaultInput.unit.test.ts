import { describe, expect, it } from 'vitest';

import { withDefaultInput } from '../withDefaultInput.ts';

describe(withDefaultInput, () => {
  it('returns a new function that accepts an undefined value', () => {
    const double = (value: number) => value * 2;
    const doubleWithDefault = withDefaultInput(double, 1);
    const expectedSum = 2;

    const actualSum = doubleWithDefault(undefined);

    expect(actualSum).toBe(expectedSum);
  });

  it('if the function has no parameters, throws an error', () => {
    const fn = () => 1;

    const throwingFn = () => withDefaultInput(fn, 1);

    expect(throwingFn).toThrow(new Error('Invalid input. The function must have one parameter.'));
  });
});
