import { describe, expect, it } from 'vitest';

import { isNumericString, safeParseNumber } from '../numeric-string.ts';

describe(isNumericString, () => {
  it('returns true for an integer string', () => {
    expect(isNumericString('42')).toBe(true);
  });

  it('returns true for a negative integer string', () => {
    expect(isNumericString('-42')).toBe(true);
  });

  it('returns true for a float string', () => {
    expect(isNumericString('3.14')).toBe(true);
  });

  it('returns true for a negative float string', () => {
    expect(isNumericString('-3.14')).toBe(true);
  });

  it('returns true for a scientific notation string', () => {
    expect(isNumericString('1e3')).toBe(true);
  });

  it('returns false for a string with mixed characters', () => {
    expect(isNumericString('123abc')).toBe(false);
  });

  it('returns false for a string with only spaces', () => {
    expect(isNumericString(' '.repeat(3))).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isNumericString('')).toBe(false);
  });

  it('returns false for non-numeric strings', () => {
    expect(isNumericString('hello')).toBe(false);
  });

  it.each([null, undefined])('returns false for %s', (value) => {
    expect(isNumericString(value)).toBe(false);
  });
});

describe(safeParseNumber, () => {
  it('parses a valid float string', () => {
    expect(safeParseNumber('3.14')).toBe(3.14);
  });

  it('parses a valid integer string', () => {
    expect(safeParseNumber('42')).toBe(42);
  });

  it('parses a negative float string', () => {
    expect(safeParseNumber('-3.14')).toBe(-3.14);
  });

  it('parses a negative integer string', () => {
    expect(safeParseNumber('-42')).toBe(-42);
  });

  it('parses a string in scientific notation', () => {
    expect(safeParseNumber('1e3')).toBe(1000);
  });

  it.each([null, undefined])('returns undefined for %s', (value) => {
    expect(safeParseNumber(value)).toBeUndefined();
  });

  it('returns undefined for a string with mixed characters', () => {
    expect(safeParseNumber('123abc')).toBeUndefined();
  });

  it('parses a string with leading and trailing spaces', () => {
    expect(safeParseNumber('  56.78  ')).toBe(56.78);
  });

  it('returns the fallback value when parsing fails', () => {
    expect(safeParseNumber('abc', 0)).toBe(0);
  });

  it('returns the fallback value for null input', () => {
    expect(safeParseNumber(null, 100)).toBe(100);
  });

  it('returns the fallback value for undefined input', () => {
    expect(safeParseNumber(undefined, -1)).toBe(-1);
  });

  it('parses a valid number string even when a fallback value is provided', () => {
    expect(safeParseNumber('42.5', 0)).toBe(42.5);
  });

  it('returns the fallback value for a string with mixed characters', () => {
    expect(safeParseNumber('123abc', 999)).toBe(999);
  });

  it('throws an error when parsing fails and the fallback value is an error', () => {
    const fallback = new Error('Parsing failed');
    expect(() => safeParseNumber('oops', fallback)).toThrow(fallback);
  });
});
