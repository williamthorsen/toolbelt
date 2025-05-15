import { describe, expect, it } from 'vitest';

import { withDefaultItemValue } from '../withDefaultItemValue.ts';

describe(withDefaultItemValue, () => {
  const sum = (values: ReadonlyArray<number>) => values.reduce((a, b) => a + b, 0);

  it('returns a new function that accepts an array containing undefined items', () => {
    const sumWithDefault = withDefaultItemValue(sum, 2);
    const expectedSum = 6;

    // @ts-expect-error - Fix legacy types
    const actualSum = sumWithDefault([1, undefined, 3]);

    expect(actualSum).toBe(expectedSum);
  });

  it('uses the default value for all items when the entire array is undefined', () => {
    const sumWithDefault = withDefaultItemValue(sum, 2);
    const expectedSum = 6;

    const actualSum = sumWithDefault([undefined, undefined, undefined]);

    expect(actualSum).toBe(expectedSum);
  });

  it('handles empty arrays gracefully', () => {
    const sumWithFallback = withDefaultItemValue(sum, 0);
    const expectedSum = 0;

    const actualSum = sumWithFallback([]);

    expect(actualSum).toBe(expectedSum);
  });

  it('works with different types and fallback values', () => {
    const concatenate = (values: ReadonlyArray<string>) => values.join('');
    const concatenateWithDefault = withDefaultItemValue(concatenate, 'X');
    const expectedResult = 'aXc';

    // @ts-expect-error - Fix legacy types
    const actualResult = concatenateWithDefault(['a', undefined, 'c']);

    expect(actualResult).toBe(expectedResult);
  });
});
