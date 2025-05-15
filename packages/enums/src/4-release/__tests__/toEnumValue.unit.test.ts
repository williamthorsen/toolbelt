import { describe, expect, it } from 'vitest';

import { toEnumValue } from '../toEnumValue.ts';

enum StringEnum {
  Alpha = 'A',
  Bravo = 'B',
}

enum NumericEnum {
  One = 1,
  Two = 2,
}

describe(toEnumValue, () => {
  it('returns the enum value for a valid enum member', () => {
    expect(toEnumValue(StringEnum, StringEnum.Alpha)).toBe(StringEnum.Alpha);
    expect(toEnumValue(NumericEnum, NumericEnum.One)).toBe(NumericEnum.One);
  });

  it.each([null, undefined])('returns undefined for %s', (value) => {
    expect(toEnumValue(StringEnum, value)).toBeUndefined();
    expect(toEnumValue(NumericEnum, value)).toBeUndefined();
  });

  describe('string enum', () => {
    it('returns the enum value if the string is a value in the enum', () => {
      expect(toEnumValue(StringEnum, 'B')).toBe(StringEnum.Bravo);
    });

    it('returns undefined if the string is not a value in the enum', () => {
      expect(toEnumValue(StringEnum, 'C')).toBeUndefined();
    });
  });

  describe('numeric enum', () => {
    it('returns the enum value if the number is a value in the enum', () => {
      expect(toEnumValue(NumericEnum, 2)).toBe(NumericEnum.Two);
    });

    it('returns undefined if the number is not a value in the enum', () => {
      expect(toEnumValue(NumericEnum, 3)).toBeUndefined();
    });
  });
});
