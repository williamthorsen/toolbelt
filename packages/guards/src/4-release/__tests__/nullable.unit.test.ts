import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { assertIsNonNullable, isNonNullable, isNullish } from '../nullable.ts';

describe(assertIsNonNullable, () => {
  it('throws an error if the value is nullish', () => {
    expect(() => {
      assertIsNonNullable(null);
    }).toThrow(new Error('Value must not be null or undefined.'));
  });

  it('narrows to the non-nullish type', () => {
    const value = asNullishUnion('');

    assertIsNonNullable(value);

    expectTypeOf(value).toEqualTypeOf<string>();
  });

  it('takes the value at its own type, rejecting a narrower explicit type argument', () => {
    const value = asNullishUnion('');
    expectTypeOf(value).toEqualTypeOf<string | null | undefined>();

    // @ts-expect-error `string | null` omits the `undefined` that the value's type carries.
    assertIsNonNullable<string | null>(value);
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
    const value = asNullishUnion('');

    // eslint-disable-next-line vitest/no-conditional-in-test -- the branches carry type assertions, not runtime logic.
    if (isNonNullable(value)) {
      expectTypeOf(value).toEqualTypeOf<string>();
    } else {
      expectTypeOf(value).toEqualTypeOf<null | undefined>();
    }
  });

  it('takes the value at its own type, rejecting a narrower explicit type argument', () => {
    const value = asNullishUnion('');
    expectTypeOf(value).toEqualTypeOf<string | null | undefined>();

    // @ts-expect-error `string | null` omits the `undefined` that the value's type carries.
    isNonNullable<string | null>(value);
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
    const value = asNullishUnion('');

    // eslint-disable-next-line vitest/no-conditional-in-test -- the branches carry type assertions, not runtime logic.
    if (isNullish(value)) {
      expectTypeOf(value).toEqualTypeOf<null | undefined>();
    } else {
      expectTypeOf(value).toEqualTypeOf<string>();
    }
  });
});

// region | Helpers

/**
 * Returns the value under its full declared type. A local initialized from a literal would be narrowed to
 * that literal before the guard runs, leaving the branch assertions vacuous.
 */
function asNullishUnion(value: string | null | undefined): string | null | undefined {
  return value;
}

// endregion | Helpers
