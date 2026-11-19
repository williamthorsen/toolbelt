import { describe, expect, it } from 'vitest';

import { clamp, type ClampBounds } from '../clamp.ts';

describe(clamp, () => {
  const returnCases: ReadonlyArray<{ bounds: ClampBounds; expected: number; scenario: string; value: number }> = [
    { scenario: 'returns a value that is within the bounds', value: 5, bounds: { min: 0, max: 10 }, expected: 5 },
    { scenario: 'returns the min for a value below it', value: -5, bounds: { min: 0, max: 10 }, expected: 0 },
    { scenario: 'returns the max for a value above it', value: 15, bounds: { min: 0, max: 10 }, expected: 10 },
    { scenario: 'applies a min-only bound', value: -5, bounds: { min: 0 }, expected: 0 },
    { scenario: 'applies a max-only bound', value: 15, bounds: { max: 10 }, expected: 10 },
    { scenario: 'returns the value when neither bound is given', value: 5, bounds: {}, expected: 5 },
    { scenario: 'treats the min as inclusive', value: 0, bounds: { min: 0, max: 10 }, expected: 0 },
    { scenario: 'treats the max as inclusive', value: 10, bounds: { min: 0, max: 10 }, expected: 10 },
    { scenario: 'returns the single point when min equals max', value: 5, bounds: { min: 3, max: 3 }, expected: 3 },
    { scenario: 'passes a NaN value through', value: NaN, bounds: { min: 0, max: 10 }, expected: NaN },
    { scenario: 'clamps an infinite value to the bound', value: Infinity, bounds: { min: 0, max: 10 }, expected: 10 },
    { scenario: 'returns an infinite value that is unbounded', value: Infinity, bounds: {}, expected: Infinity },
    { scenario: 'accepts infinite bounds', value: 5, bounds: { min: -Infinity, max: Infinity }, expected: 5 },
    { scenario: 'returns negative zero from a -0 min', value: -2, bounds: { min: -0, max: 10 }, expected: -0 },
    { scenario: 'keeps positive zero against a -0 min', value: 0, bounds: { min: -0, max: 10 }, expected: 0 },
    { scenario: 'returns negative zero from a -0 max', value: 0, bounds: { min: -10, max: -0 }, expected: -0 },
  ];

  it.each(returnCases)('$scenario', ({ bounds, expected, value }) => {
    expect(clamp(value, bounds)).toBe(expected);
  });

  // Asserts indirectly: Under `exactOptionalPropertyTypes` the call stops compiling if `ClampBounds`
  // drops the explicit `undefined`.
  it('accepts a bound whose value may be undefined', () => {
    expect(clamp(-5, { min: findOptionalMin() })).toBe(0);
  });

  const throwCases: ReadonlyArray<{ bounds: ClampBounds; scenario: string }> = [
    { scenario: 'a reversed range', bounds: { min: 10, max: 0 } },
    { scenario: 'a NaN min alongside a valid max', bounds: { min: NaN, max: 10 } },
    { scenario: 'a NaN max alongside a valid min', bounds: { min: 0, max: NaN } },
    { scenario: 'a lone NaN min', bounds: { min: NaN } },
    { scenario: 'a lone NaN max', bounds: { max: NaN } },
  ];

  it.each(throwCases)('throws a RangeError for $scenario', ({ bounds }) => {
    const throwingFn = () => clamp(5, bounds);

    expect(throwingFn).toThrow(RangeError);
  });

  const messageCases: ReadonlyArray<{ bounds: ClampBounds; received: string }> = [
    { bounds: { min: 10, max: 0 }, received: 'Received min=10, max=0.' },
    { bounds: { min: NaN }, received: 'Received min=NaN, max=undefined.' },
  ];

  it.each(messageCases)('reports the bounds that it was given as "$received"', ({ bounds, received }) => {
    const throwingFn = () => clamp(5, bounds);

    expect(throwingFn).toThrow(received);
  });
});

// region | Helpers

/**
 * Returns a bound that control-flow analysis cannot narrow to `number`.
 */
function findOptionalMin(): number | undefined {
  return 0;
}

// endregion | Helpers
