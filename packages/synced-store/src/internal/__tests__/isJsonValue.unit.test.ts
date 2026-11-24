import { describe, expect, it } from 'vitest';

import { isJsonValue } from '../isJsonValue.ts';

describe(isJsonValue, () => {
  it.each([
    ['null', null],
    ['a boolean', false],
    ['a finite number', -1.5],
    ['a string', ''],
    ['nested arrays and objects', { tithe: [10, { note: 'weekly' }], open: true }],
    ['a value shared by two members', { a: [1], b: [1] }],
  ])('accepts %s', (_label, value) => {
    expect(isJsonValue(value)).toBe(true);
  });

  const cyclic: Record<string, unknown> = {};
  cyclic['self'] = cyclic;

  it.each([
    ['NaN', NaN],
    ['Infinity', Infinity],
    ['undefined', undefined],
    ['an undefined member', { a: undefined }],
    // eslint-disable-next-line no-sparse-arrays -- the hole is the case under test.
    ['an array with a hole', [1, , 3]],
    ['a date', new Date(0)],
    ['a nested non-finite number', { rates: [1, NaN] }],
    ['a cycle', cyclic],
  ])('rejects %s', (_label, value) => {
    expect(isJsonValue(value)).toBe(false);
  });
});
