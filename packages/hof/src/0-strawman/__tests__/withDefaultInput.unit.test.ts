import { describe, expect, expectTypeOf, it } from 'vitest';

import { withDefaultInput } from '../withDefaultInput.ts';

describe(withDefaultInput, () => {
  it('replaces an undefined input with the default value', () => {
    const double = (value: number) => value * 2;
    const doubleWithDefault = withDefaultInput(double, 1);
    const expectedSum = 2;

    const actualSum = doubleWithDefault(undefined);

    expect(actualSum).toBe(expectedSum);
  });

  it('passes a defined value through unchanged', () => {
    const double = (value: number) => value * 2;
    const doubleWithDefault = withDefaultInput(double, 1);

    const actualSum = doubleWithDefault(5);

    expect(actualSum).toBe(10);
  });

  it('passes null through unchanged', () => {
    const describeValue = (value: number | null) => (value === null ? 'null' : String(value));
    const describeWithDefault = withDefaultInput(describeValue, 1);

    const actualResult = describeWithDefault(null);

    expect(actualResult).toBe('null');
  });

  it('accepts a function whose parameter has a default', () => {
    const identity = (value = 0) => value;
    const identityWithDefault = withDefaultInput(identity, 1);

    const actualResult = identityWithDefault(undefined);

    expect(actualResult).toBe(1);
  });

  it('accepts a function whose parameter is a rest parameter', () => {
    const collect = (...values: number[]) => values;
    const collectWithDefault = withDefaultInput(collect, 1);

    const actualResult = collectWithDefault(undefined);

    expect(actualResult).toStrictEqual([1]);
  });

  it('infers the input type from `fn` rather than from a literal default', () => {
    const double = (value: number) => value * 2;

    expectTypeOf(withDefaultInput(double, 1)).toEqualTypeOf<(value: number | undefined) => number>();
  });
});
