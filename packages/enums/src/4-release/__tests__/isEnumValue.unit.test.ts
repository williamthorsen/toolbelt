import { describe, expect, it } from 'vitest';

import { isEnumValue } from '../isEnumValue.ts';

enum StringEnum {
  Alpha = 'A',
  Bravo = 'B',
}

enum NumericEnum {
  One = 1,
  Two = 2,
}

describe(isEnumValue, () => {
  it('returns true for a valid enum member', () => {
    expect(isEnumValue(StringEnum, StringEnum.Alpha)).toBe(true);
    expect(isEnumValue(NumericEnum, NumericEnum.One)).toBe(true);
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
  });
});
