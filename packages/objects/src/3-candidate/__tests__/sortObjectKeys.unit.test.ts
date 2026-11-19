import { describe, expect, it } from 'vitest';

import type { PlainObject } from '../../4-release/is-object.ts';
import { sortObjectKeys } from '../sortObjectKeys.ts';

describe(sortObjectKeys, () => {
  it('sorts keys in a flat object', () => {
    const input = { z: 1, a: 2, m: 3 };
    const expected = { a: 2, m: 3, z: 1 };

    const actual = sortObjectKeys(input);

    expect(actual).toStrictEqual(expected);
  });

  it('recursively sorts keys in nested objects', () => {
    const input = { z: 1, a: 2, m: { y: 1, b: 2 } };
    const expected = { a: 2, m: { b: 2, y: 1 }, z: 1 };

    const actual = sortObjectKeys(input);

    expect(actual).toStrictEqual(expected);
  });

  it('recursively sorts keys in objects within nested arrays', () => {
    const input = {
      z: 1,
      a: [
        { z: 3, a: 1 },
        { y: 2, x: 3 },
      ],
      m: 3,
    };
    const expected = {
      a: [
        { a: 1, z: 3 },
        { x: 3, y: 2 },
      ],
      m: 3,
      z: 1,
    };

    const actual = sortObjectKeys(input);

    expect(actual).toStrictEqual(expected);
  });

  it('does not try to sort the keys of objects other than plain objects', () => {
    const date = new Date();
    const input = { z: 1, a: 2, m: date };
    const expected = { a: 2, m: date, z: 1 };

    const actual = sortObjectKeys(input);

    expect(actual).toStrictEqual(expected);
  });

  it('sorts with custom compare function', () => {
    const customCompareFn = (keyA: string, keyB: string) => keyB.localeCompare(keyA);
    const input = { z: 1, a: 2, m: 3 };
    const expected = { z: 1, m: 3, a: 2 };

    const actual = sortObjectKeys(input, customCompareFn);

    expect(actual).toStrictEqual(expected);
  });

  it('sorts a nested null-prototype object, returning one with the ordinary prototype', () => {
    const nested: PlainObject = Object.assign(Object.create(null), { y: 1, b: 2 });
    const input = { z: 1, a: 2, m: nested };

    const actual = sortObjectKeys(input);

    expect(Object.keys(actual)).toStrictEqual(['a', 'm', 'z']);
    expect(Object.keys(actual.m)).toStrictEqual(['b', 'y']);
    expect(Object.getPrototypeOf(actual.m)).toBe(Object.prototype);
  });

  it('returns a nested object with Symbol.iterator unsorted', () => {
    const nested = { y: 1, b: 2, [Symbol.iterator]: () => [].values() };
    const input = { z: 1, a: 2, m: nested };

    const actual = sortObjectKeys(input);

    expect(Object.keys(actual)).toStrictEqual(['a', 'm', 'z']);
    expect(actual.m).toBe(nested);
  });

  it('copies symbol-keyed properties after the sorted string keys, sorting their values', () => {
    const tag = Symbol('tag');
    const nested = { y: 1, b: 2 };
    const input = { z: 1, [tag]: nested, a: 2 };

    const actual = sortObjectKeys(input);

    expect(Reflect.ownKeys(actual)).toStrictEqual(['a', 'z', tag]);
    expect(actual[tag]).not.toBe(nested);
    expect(Object.keys(actual[tag])).toStrictEqual(['b', 'y']);
  });
});
