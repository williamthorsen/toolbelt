import { describe, expect, it } from 'vitest';

import { mapToObject } from '../mapToObject.ts';

describe(mapToObject, () => {
  it('returns an empty object when given an empty map', () => {
    const map = new Map<string, number>();
    const expected: Record<string, number> = {};

    const actual = mapToObject(map);

    expect(actual).toStrictEqual(expected);
  });

  it('converts a simple map to a corresponding object', () => {
    const map = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]);
    const expected = {
      a: 1,
      b: 2,
      c: 3,
    };

    const actual = mapToObject(map);

    expect(actual).toStrictEqual(expected);
  });

  it('handles maps with mixed key types', () => {
    const symbolKey = Symbol('a');
    const map = new Map<PropertyKey, number>([
      ['a', 1],
      [1, 2],
      [symbolKey, 3],
    ]);
    const expected = {
      a: 1,
      1: 2, // Number keys in objects will be stringified
      [symbolKey]: 3,
    };

    const actual = mapToObject(map);

    expect(actual).toStrictEqual(expected);
  });

  it('overwrites earlier entries in map with later ones with the same key', () => {
    const map = new Map([
      ['a', 1],
      ['a', 2],
    ]);
    const expected = {
      a: 2,
    };

    const actual = mapToObject(map);

    expect(actual).toStrictEqual(expected);
  });
});
