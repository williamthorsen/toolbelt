import { describe, expect, it } from 'vitest';

import { toArray, toSet } from '../conversions.ts';

describe(toArray, () => {
  it('returns the input if it is already an array', () => {
    const input = [1, 2, 3];
    const expected = input;

    const actual = toArray(input);

    expect(actual).toBe(expected);
  });

  it('converts a Set to an array', () => {
    const input = new Set([1, 2, 3]);
    const expected = [1, 2, 3];

    const actual = toArray(input);

    expect(actual).toStrictEqual(expected);
    expect(actual).not.toBe(input);
  });

  it('converts an iterable to an array', () => {
    const input = new Map([
      [1, 'a'],
      [2, 'b'],
    ]).keys();
    const expected = [1, 2];

    const actual = toArray(input);

    expect(actual).toStrictEqual(expected);
    expect(actual).not.toBe(input);
  });
});

describe(toSet, () => {
  it('returns the input if it is already a Set', () => {
    const input = new Set([1, 2, 3]);
    const expected = input;

    const actual = toSet(input);

    expect(actual).toBe(expected);
  });

  it('converts an Array to a Set', () => {
    const input = [1, 2, 3];
    const expected = new Set([1, 2, 3]);

    const actual = toSet(input);

    expect(actual).toStrictEqual(expected);
    expect(actual).not.toBe(input);
  });

  it('converts an iterable to a Set', () => {
    const input = new Map([
      [1, 'a'],
      [2, 'b'],
    ]).keys();
    const expected = new Set([1, 2]);

    const actual = toSet(input);

    expect(actual).toStrictEqual(expected);
    expect(actual).not.toBe(input);
  });
});
