import { describe, expect, it } from 'vitest';

import { isUnknownArray } from '../isUnknownArray.ts';

describe(isUnknownArray, () => {
  it.each([
    { label: 'an empty array', value: [] },
    { label: 'a populated array', value: ['./index.js'] },
    { label: 'an array of undefined', value: Array.from({ length: 2 }) },
  ])('returns true for $label', ({ value }) => {
    expect(isUnknownArray(value)).toBe(true);
  });

  it.each([
    { label: 'an object', value: { length: 0 } },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'a string', value: 'index.js' },
    { label: 'a number', value: 1 },
  ])('returns false for $label', ({ value }) => {
    expect(isUnknownArray(value)).toBe(false);
  });
});
