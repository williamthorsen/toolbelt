import { describe, expect, it } from 'vitest';

import { indexIntoRange, type IndexRange } from '../indexIntoRange.ts';

const MAX_EXACT_SPAN = 2 ** 52;

describe(indexIntoRange, () => {
  const returnCases: ReadonlyArray<{ expected: number; index: number; range: IndexRange; scenario: string }> = [
    { scenario: 'returns an index within a zero-based range', index: 5, range: { max: 9 }, expected: 5 },
    { scenario: 'cycles an index past the max', index: 1232, range: { max: 999 }, expected: 232 },
    { scenario: 'counts a negative index back from the max', index: -1, range: { max: 6 }, expected: 6 },
    { scenario: 'counts from a min above zero', index: 5, range: { min: 1, max: 7 }, expected: 6 },
    { scenario: 'counts from a negative min', index: 3, range: { min: -5, max: 5 }, expected: -2 },
    { scenario: 'returns the single point when min equals max', index: 99, range: { min: 4, max: 4 }, expected: 4 },
    { scenario: 'rotates by a positive offset', index: 5, range: { min: 1, max: 7, offset: 4 }, expected: 3 },
    { scenario: 'rotates by a negative offset', index: 2, range: { max: 9, offset: -3 }, expected: 9 },
    { scenario: 'rotates by an offset wider than the span', index: 0, range: { max: 9, offset: 23 }, expected: 3 },
  ];

  it.each(returnCases)('$scenario', ({ expected, index, range }) => {
    expect(indexIntoRange(index, range)).toBe(expected);
  });

  it('reduces an index beyond the safe integers exactly', () => {
    // 2^53 + 2 is exactly representable, and its remainder modulo 1000 is 994.
    expect(indexIntoRange(2 ** 53 + 2, { max: 999 })).toBe(994);
  });

  it('rotates exactly across the widest default span', () => {
    const range: IndexRange = { max: MAX_EXACT_SPAN - 1, offset: Number.MAX_SAFE_INTEGER };

    expect(indexIntoRange(MAX_EXACT_SPAN - 1, range)).toBe(MAX_EXACT_SPAN - 2);
  });

  it('accepts a range that spans exactly maxSpan values', () => {
    expect(indexIntoRange(10, { max: 9, maxSpan: 10 })).toBe(0);
  });

  const throwCases: ReadonlyArray<{ index?: number; message: string; range: IndexRange; scenario: string }> = [
    {
      scenario: 'a non-integer maxSpan',
      range: { max: 9, maxSpan: 1.5 },
      message: 'Invalid span: maxSpan must be a safe integer from 1 to 2^52. Received 1.5.',
    },
    {
      scenario: 'a maxSpan of zero',
      range: { max: 9, maxSpan: 0 },
      message: 'Invalid span: maxSpan must be a safe integer from 1 to 2^52. Received 0.',
    },
    {
      scenario: 'a maxSpan above 2^52',
      range: { max: 9, maxSpan: MAX_EXACT_SPAN + 1 },
      message: `Invalid span: maxSpan must be a safe integer from 1 to 2^52. Received ${MAX_EXACT_SPAN + 1}.`,
    },
    {
      scenario: 'a non-integer min',
      range: { min: 1.5, max: 9 },
      message: 'Invalid range: min and max must be safe integers. Received min=1.5, max=9.',
    },
    {
      scenario: 'an infinite max',
      range: { max: Infinity },
      message: 'Invalid range: min and max must be safe integers. Received min=0, max=Infinity.',
    },
    {
      scenario: 'a reversed range',
      range: { min: 10, max: 0 },
      message: 'Invalid range: min must be less than or equal to max. Received min=10, max=0.',
    },
    {
      scenario: 'a non-integer offset',
      range: { max: 9, offset: 1.5 },
      message: 'Invalid offset: offset must be a safe integer. Received 1.5.',
    },
    {
      scenario: 'a range wider than maxSpan',
      range: { max: 10, maxSpan: 10 },
      message: 'Invalid range: The range cannot span more than 10 values. Received min=0, max=10.',
    },
    {
      scenario: 'a range wider than the default maxSpan',
      range: { max: MAX_EXACT_SPAN },
      message: `Invalid range: The range cannot span more than ${MAX_EXACT_SPAN} values. Received min=0, max=${MAX_EXACT_SPAN}.`,
    },
    {
      scenario: 'a non-integer index',
      index: 1.5,
      range: { max: 9 },
      message: 'Invalid index: index must be an integer. Received 1.5.',
    },
    {
      scenario: 'an infinite index',
      index: Infinity,
      range: { max: 9 },
      message: 'Invalid index: index must be an integer. Received Infinity.',
    },
  ];

  it.each(throwCases)('throws a RangeError for $scenario', ({ index = 0, message, range }) => {
    const throwingFn = () => indexIntoRange(index, range);

    expect(throwingFn).toThrow(new RangeError(message));
  });

  it('reports a bad range ahead of a bad index', () => {
    const throwingFn = () => indexIntoRange(Infinity, { min: 10, max: 0 });

    expect(throwingFn).toThrow('min must be less than or equal to max');
  });
});
