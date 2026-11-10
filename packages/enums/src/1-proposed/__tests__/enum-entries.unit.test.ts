import { describe, expect, expectTypeOf, it } from 'vitest';

import { listEnumEntries, listEnumKeys, listEnumValues } from '../enum-entries.ts';

enum StringEnum {
  Alpha = 'A',
  Bravo = 'B',
}

enum NumericEnum {
  One = 1,
  Two = 2,
}

describe(listEnumEntries, () => {
  it('returns entries for a string enum', () => {
    expect(listEnumEntries(StringEnum)).toStrictEqual([
      ['Alpha', 'A'],
      ['Bravo', 'B'],
    ]);
  });

  it('returns entries for a numeric enum', () => {
    expect(listEnumEntries(NumericEnum)).toStrictEqual([
      ['One', 1],
      ['Two', 2],
    ]);
  });
});

describe(listEnumKeys, () => {
  it('returns keys for a string enum', () => {
    const expected = ['Alpha', 'Bravo'];

    const actual = listEnumKeys(StringEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(keyof typeof StringEnum)[]>();
  });

  it('returns keys for a numeric enum', () => {
    const expected = ['One', 'Two'];

    const actual = listEnumKeys(NumericEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(keyof typeof NumericEnum)[]>();
  });
});

describe(listEnumValues, () => {
  it('returns values for a string enum', () => {
    const expected = ['A', 'B'];

    const actual = listEnumValues(StringEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(typeof StringEnum)[keyof typeof StringEnum][]>();
  });

  it('returns values for a numeric enum', () => {
    const expected = [1, 2];

    const actual = listEnumValues(NumericEnum);

    expect(actual).toStrictEqual(expected);
    expectTypeOf(actual).toEqualTypeOf<(typeof NumericEnum)[keyof typeof NumericEnum][]>();
  });
});
