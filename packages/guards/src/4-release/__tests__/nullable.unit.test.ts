import { describe, expect, it, vi } from 'vitest';

import { assertIsNonNullable, isNonNullable, isNullable } from '../nullable.ts';

describe(assertIsNonNullable, () => {
  it('throws an error if the value is nullable', () => {
    expect(() => {
      assertIsNonNullable(null);
    }).toThrowError(new Error('Value must not be null or undefined.'));
  });
});

describe(isNonNullable, () => {
  it.each([null, undefined])('returns false if the value is %s', (value) => {
    expect(isNonNullable(value)).toBe(false);
  });

  // eslint-disable-next-line vitest/prefer-each
  for (const value of ['', false, 0, {}, vi.fn]) {
    it(`returns true if the value is a ${typeof value}`, () => {
      expect(isNonNullable(value)).toBe(true);
    });
  }
});

describe(isNullable, () => {
  it.each([null, undefined])('returns true if the value is %s', (value) => {
    expect(isNullable(value)).toBe(true);
  });

  // eslint-disable-next-line vitest/prefer-each
  for (const value of ['', false, 0, {}, vi.fn]) {
    it(`returns false if the value is a ${typeof value}`, () => {
      expect(isNullable(value)).toBe(false);
    });
  }
});
