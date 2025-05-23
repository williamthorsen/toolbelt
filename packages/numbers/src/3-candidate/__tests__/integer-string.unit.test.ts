import { describe, expect, it } from 'vitest';

import { isIntegerString, safeParseInteger } from '../integer-string.ts';

describe(isIntegerString, () => {
  it('returns true for a valid integer string', () => {
    expect(isIntegerString('42')).toBe(true);
  });

  it('returns false for a non-numeric string', () => {
    expect(isIntegerString('abc')).toBe(false);
  });

  it('returns false for a non-integer numeric string', () => {
    expect(isIntegerString('42.5')).toBe(false);
  });

  it.each([null, undefined])('return false for %s', (value) => {
    expect(isIntegerString(value)).toBe(false);
  });

  it('return false for a string with mixed characters', () => {
    expect(isIntegerString('123abc')).toBe(false);
  });
});

describe(safeParseInteger, () => {
  it('parses a valid integer string', () => {
    const value = '42';
    const expected = 42;

    const actual = safeParseInteger(value);

    expect(actual).toBe(expected);
  });

  it('parses a negative integer string', () => {
    const value = '-123';
    const expected = -123;

    const actual = safeParseInteger(value);

    expect(actual).toBe(expected);
  });

  it.each([null, undefined])('returns undefined for %s', (value) => {
    const actual = safeParseInteger(value);

    expect(actual).toBeUndefined();
  });

  it('returns undefined for a string with mixed characters', () => {
    const value = '123abc';

    const actual = safeParseInteger(value);

    expect(actual).toBeUndefined();
  });

  it('parses a string with leading and trailing spaces', () => {
    const value = '  56  ';
    const expected = 56;

    const actual = safeParseInteger(value);

    expect(actual).toBe(expected);
  });

  it('returns the fallback value when parsing fails', () => {
    const value = 'abc';
    const fallbackValue = 0;

    const actual = safeParseInteger(value, fallbackValue);

    expect(actual).toBe(fallbackValue);
  });

  it('returns the fallback value for null input', () => {
    const value = null;
    const fallbackValue = 100;

    const actual = safeParseInteger(value, fallbackValue);

    expect(actual).toBe(fallbackValue);
  });

  it('returns the fallback value for undefined input', () => {
    const value = undefined;
    const fallbackValue = -1;

    const actual = safeParseInteger(value, fallbackValue);

    expect(actual).toBe(fallbackValue);
  });

  it('parses a valid integer string even when a fallback value is provided', () => {
    const value = '42';
    const fallbackValue = 0;

    const actual = safeParseInteger(value, fallbackValue);

    expect(actual).toBe(42);
  });

  it('parses a negative integer string even when a fallback value is provided', () => {
    const value = '-123';
    const fallbackValue = 0;

    const actual = safeParseInteger(value, fallbackValue);

    expect(actual).toBe(-123);
  });

  it('returns the fallback value for a string with mixed characters', () => {
    const value = '123abc';
    const fallbackValue = 999;

    const actual = safeParseInteger(value, fallbackValue);

    expect(actual).toBe(fallbackValue);
  });
});
