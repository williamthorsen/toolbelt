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

/* eslint-disable @typescript-eslint/no-mixed-enums -- A consumer's mixed enum is input that the guard must handle. */
enum HeterogeneousEnum {
  A = 1,
  B = 'A',
}
/* eslint-enable @typescript-eslint/no-mixed-enums */

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

    it('returns false for a member name that the reverse mapping adds to the values', () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Stands in for untyped input; the signature rejects a member name.
      expect(isEnumValue(NumericEnum, 'One' as unknown as number)).toBe(false);
    });
  });

  describe('heterogeneous enum', () => {
    it('returns true for a string value that equals the name of a numeric member', () => {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The signature types a mixed enum's values as numbers.
      expect(isEnumValue(HeterogeneousEnum, 'A' as unknown as number)).toBe(true);
    });
  });
});
