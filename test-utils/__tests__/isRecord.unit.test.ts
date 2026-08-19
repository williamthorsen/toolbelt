import { describe, expect, it } from 'vitest';

import { isRecord } from '../isRecord.ts';

describe(isRecord, () => {
  it.each([
    { label: 'an empty object', value: {} },
    { label: 'a populated object', value: { name: '@scope/pkg' } },
    { label: 'a class instance', value: new Date() },
    { label: 'a null-prototype object', value: Object.create(null) },
  ])('returns true for $label', ({ value }) => {
    expect(isRecord(value)).toBe(true);
  });

  it.each([
    { label: 'an empty array', value: [] },
    { label: 'a populated array', value: ['./index.js'] },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
    { label: 'a string', value: 'index.js' },
    { label: 'a number', value: 1 },
    { label: 'a function', value: () => undefined },
  ])('returns false for $label', ({ value }) => {
    expect(isRecord(value)).toBe(false);
  });
});
