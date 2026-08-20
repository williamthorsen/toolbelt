import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { assertIsNonNullable, isNonNullable, isNullish } from '../nullable.ts';

describe(assertIsNonNullable, () => {
  it('throws an error if the value is nullish', () => {
    expect(() => {
      assertIsNonNullable(null);
    }).toThrow(new Error('Value must not be null or undefined.'));
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

  it('narrows each branch of a nullish union', () => {
    assertNonNullableNarrowing('');
  });
});

describe(isNullish, () => {
  it.each([null, undefined])('returns true if the value is %s', (value) => {
    expect(isNullish(value)).toBe(true);
  });

  // eslint-disable-next-line vitest/prefer-each
  for (const value of ['', false, 0, {}, vi.fn]) {
    it(`returns false if the value is a ${typeof value}`, () => {
      expect(isNullish(value)).toBe(false);
    });
  }

  it('narrows to null | undefined', () => {
    expectTypeOf(isNullish).guards.toEqualTypeOf<null | undefined>();
  });

  it('narrows each branch of a nullish union', () => {
    assertNullishNarrowing('');
  });
});

// region | Helpers

/**
 * Asserts the type of each branch of an `isNonNullable` check. The subject is a parameter because a local
 * would be narrowed to its initializer before the guard runs.
 */
function assertNonNullableNarrowing(value: string | null | undefined): void {
  if (isNonNullable(value)) {
    expectTypeOf(value).toEqualTypeOf<string>();
  } else {
    expectTypeOf(value).toEqualTypeOf<null | undefined>();
  }
}

/**
 * Asserts the type of each branch of an `isNullish` check.
 */
function assertNullishNarrowing(value: string | null | undefined): void {
  if (isNullish(value)) {
    expectTypeOf(value).toEqualTypeOf<null | undefined>();
  } else {
    expectTypeOf(value).toEqualTypeOf<string>();
  }
}

// endregion | Helpers
