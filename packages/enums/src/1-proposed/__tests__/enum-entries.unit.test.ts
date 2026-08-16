import { describe, expect, expectTypeOf, it } from 'vitest';

import { enumEntries, enumKeys, enumValues } from '../enum-entries.ts';

enum StringEnum {
  Alpha = 'A',
  Bravo = 'B',
}

enum NumericEnum {
  One = 1,
  Two = 2,
}

describe(enumEntries, () => {
  it('returns entries for a string enum', () => {
    expect(enumEntries(StringEnum)).toStrictEqual([
      ['Alpha', 'A'],
      ['Bravo', 'B'],
    ]);
  });

  it('returns entries for a numeric enum', () => {
    expect(enumEntries(NumericEnum)).toStrictEqual([
      ['One', 1],
      ['Two', 2],
    ]);
  });
});

describe(enumKeys, () => {
  it('returns keys for a string enum', () => {
    const expected = ['Alpha', 'Bravo'];

    const actual = enumKeys(StringEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(keyof typeof StringEnum)[]>();
  });

  it('returns keys for a numeric enum', () => {
    const expected = ['One', 'Two'];

    const actual = enumKeys(NumericEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(keyof typeof NumericEnum)[]>();
  });
});

describe(enumValues, () => {
  it('returns values for a string enum', () => {
    const expected = ['A', 'B'];

    const actual = enumValues(StringEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(typeof StringEnum)[keyof typeof StringEnum][]>();
  });

  it('returns values for a numeric enum', () => {
    const expected = [1, 2];

    const actual = enumValues(NumericEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(typeof NumericEnum)[keyof typeof NumericEnum][]>();
  });
});
