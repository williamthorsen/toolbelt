import { describe, expect, it } from 'vitest';

import { isBoolean, isNumber, isString } from '../primitives.ts';

describe(isBoolean, () => {
  it.each([true, false])('returns if value is a boolean', (value) => {
    expect(isBoolean(value)).toBe(true);
  });

  it('returns false when value is falsy', () => {
    for (const value of [0, null, undefined, '']) {
      expect(isBoolean(value)).toBe(false);
    }
  });
});

describe(isNumber, () => {
  it.each([0, -1, 1, -Infinity, Infinity])('returns if value is %s', (value) => {
    expect(isNumber(value)).toBe(true);
  });

  it('returns false when value is NaN', () => {
    expect(isNumber(NaN)).toBe(false);
  });

  it('returns true when value is a numeric enum member', () => {
    expect(isNumber(NumericEnum.Value)).toBe(true);
  });
});

describe(isString, () => {
  it('returns true when value is string', () => {
    expect(isString('')).toBe(true);
  });

  it('returns true when value is string enum member', () => {
    expect(isString(StringEnum.Value)).toBe(true);
  });

  it('returns false when value is a numeric enum member', () => {
    expect(isString(NumericEnum.Value)).toBe(false);
  });

  it('returns false for a Symbol', () => {
    expect(isString(Symbol('test'))).toBe(false);
  });
});

enum NumericEnum {
  Value = 0,
}

enum StringEnum {
  Value = 'value',
}
