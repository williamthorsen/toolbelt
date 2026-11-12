import { describe, expect, it } from 'vitest';

import { toOrdinal } from '../toOrdinal.ts';

describe(toOrdinal, () => {
  it.each([
    { input: 1, expected: '1st' },
    { input: 2, expected: '2nd' },
    { input: 3, expected: '3rd' },
    { input: 4, expected: '4th' },
    { input: 11, expected: '11th' },
    { input: 12, expected: '12th' },
    { input: 13, expected: '13th' },
    { input: 21, expected: '21st' },
    { input: 22, expected: '22nd' },
    { input: 23, expected: '23rd' },
    { input: 100, expected: '100th' },
  ])('returns $expected for $input', ({ input, expected }) => {
    expect(toOrdinal(input)).toBe(expected);
  });

  it('keeps the minus sign and takes the suffix of the absolute value', () => {
    expect(toOrdinal(-1)).toBe('-1st');
    expect(toOrdinal(-2)).toBe('-2nd');
    expect(toOrdinal(-3)).toBe('-3rd');
    expect(toOrdinal(-4)).toBe('-4th');
    expect(toOrdinal(-11)).toBe('-11th');
    expect(toOrdinal(-12)).toBe('-12th');
    expect(toOrdinal(-13)).toBe('-13th');
  });

  it('gives zero the suffix "th"', () => {
    expect(toOrdinal(0)).toBe('0th');
  });
});
