import { describe, expect, expectTypeOf, it } from 'vitest';

import { isEnumValue } from '../isEnumValue.ts';

enum StringEnum {
  Alpha = 'A',
  Bravo = 'B',
}

enum NumericEnum {
  One = 1,
  Two = 2,
}

// The compiled form of `enum { A = 1, B = 'A' }`: The reverse mapping adds the key `1`.
const HeterogeneousEnum = { A: 1, 1: 'A', B: 'A' };

describe(isEnumValue, () => {
  it('returns true for a valid enum member', () => {
    expect(isEnumValue(StringEnum, StringEnum.Alpha)).toBe(true);
    expect(isEnumValue(NumericEnum, NumericEnum.One)).toBe(true);
  });

  it('narrows an unknown value to the enum type', () => {
    const values: unknown[] = ['A', 'C'];

    expectTypeOf(values.filter((value) => isEnumValue(StringEnum, value))).branded.toEqualTypeOf<StringEnum[]>();
  });

  it.each([null, undefined])('returns false for %s', (value) => {
    expect(isEnumValue(StringEnum, value)).toBe(false);
    expect(isEnumValue(NumericEnum, value)).toBe(false);
  });

  describe('string enum', () => {
    it('returns true if the string is a value in the enum', () => {
      expect(isEnumValue(StringEnum, 'B')).toBe(true);
    });

    it('returns false if the string is not a value in the enum', () => {
      expect(isEnumValue(StringEnum, 'C')).toBe(false);
    });
  });

  describe('numeric enum', () => {
    it('returns true if the number is a value in the enum', () => {
      expect(isEnumValue(NumericEnum, 2)).toBe(true);
    });

    it('returns false if the number is not a value in the enum', () => {
      expect(isEnumValue(NumericEnum, 3)).toBe(false);
    });

    it('returns false for a member name that the reverse mapping adds to the values', () => {
      expect(isEnumValue(NumericEnum, 'One')).toBe(false);
    });
  });

  describe('plain object', () => {
    it('returns true for the value of a numeric-string key', () => {
      expect(isEnumValue({ 200: 'OK', 404: 'NotFound' }, 'OK')).toBe(true);
    });

    it('returns true for the value of an empty-string key', () => {
      expect(isEnumValue({ '': 'none', a: 'x' }, 'none')).toBe(true);
    });
  });

  describe('heterogeneous enum', () => {
    it('returns true for a string value that equals the name of a numeric member', () => {
      expect(isEnumValue(HeterogeneousEnum, 'A')).toBe(true);
    });
  });
});
