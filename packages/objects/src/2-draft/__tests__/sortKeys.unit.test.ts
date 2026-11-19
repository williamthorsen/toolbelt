import { describe, expect, it } from 'vitest';

import type { PlainObject } from '../../4-release/is-object.ts';
import { sortKeys } from '../sortKeys.ts';

describe(sortKeys, () => {
  it('sorts keys in a flat object', () => {
    const input = { z: 1, a: 2, m: 3 };
    const expected = { a: 2, m: 3, z: 1 };

    const actual = sortKeys(input);

    expect(actual).toStrictEqual(expected);
  });

  it('does not try to sort the keys of objects other than plain objects', () => {
    const input = new Date();
    const expected = input;

    // @ts-expect-error - Unsupported use case
    const actual = sortKeys(input);

    expect(actual).toStrictEqual(expected);
  });

  it('sorts with a custom compare function', () => {
    const compare = (keyA: string, keyB: string) => keyB.localeCompare(keyA);
    const input = { z: 1, a: 2, m: 3 };
    const expected = { z: 1, m: 3, a: 2 };

    const actual = sortKeys(input, compare);

    expect(actual).toStrictEqual(expected);
  });

  it('sorts a null-prototype object, returning one with the ordinary prototype', () => {
    const input: PlainObject = Object.assign(Object.create(null), { z: 1, a: 2 });

    const actual = sortKeys(input);

    expect(Object.keys(actual)).toStrictEqual(['a', 'z']);
    expect(Object.getPrototypeOf(actual)).toBe(Object.prototype);
  });

  it('returns an object with Symbol.iterator unsorted', () => {
    // `PlainObject`'s string index signature does not admit a symbol-keyed literal.
    const input: PlainObject = { z: 1, a: 2 };
    Object.defineProperty(input, Symbol.iterator, { enumerable: true, value: () => [].values() });

    const actual = sortKeys(input);

    expect(Object.keys(actual)).toStrictEqual(['z', 'a']);
  });

  it('copies enumerable symbol-keyed properties after the sorted string keys, in their original order', () => {
    const first = Symbol('first');
    const second = Symbol('second');
    const input = { [second]: 3, b: 1, [first]: 4, a: 2 };

    const actual = sortKeys(input);

    expect(Reflect.ownKeys(actual)).toStrictEqual(['a', 'b', second, first]);
    expect(actual[second]).toBe(3);
    expect(actual[first]).toBe(4);
  });

  it('does not copy a non-enumerable symbol-keyed property', () => {
    const hidden = Symbol('hidden');
    const input: PlainObject = { b: 1, a: 2 };
    Object.defineProperty(input, hidden, { enumerable: false, value: 3 });

    const actual = sortKeys(input);

    expect(Reflect.ownKeys(actual)).toStrictEqual(['a', 'b']);
  });
});
