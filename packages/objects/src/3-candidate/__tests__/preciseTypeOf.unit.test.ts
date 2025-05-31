import { describe, expect, it } from 'vitest';

import { preciseTypeOf } from '../preciseTypeOf.ts';

describe(preciseTypeOf, () => {
  it('returns "null" for null', () => {
    const input = null;
    const expected = 'null';

    const actual = preciseTypeOf(input);

    expect(actual).toBe(expected);
  });

  it('returns "array" for arrays', () => {
    const input = [1, 2, 3];
    const expected = 'array';

    const actual = preciseTypeOf(input);

    expect(actual).toBe(expected);
  });

  it('returns "plainobject" for plain objects', () => {
    const input = { a: 1, b: 2, c: 3 };
    const expected = 'plainobject';

    const actual = preciseTypeOf(input);

    expect(actual).toBe(expected);
  });

  it('returns "instance" for instances of built-in classes', () => {
    class TestClass {}
    const input = new TestClass();
    const expected = 'instance';

    const actual = preciseTypeOf(input);

    expect(actual).toBe(expected);
  });

  it('returns "instance" for instances of custom classes', () => {
    class TestClass {}
    const input = new TestClass();
    const expected = 'instance';

    const actual = preciseTypeOf(input);

    expect(actual).toBe(expected);
  });

  // eslint-disable-next-line vitest/prefer-each
  for (const [input, expected] of [
    [undefined, 'undefined'],
    [() => {}, 'function'],
    [1, 'number'],
    ['a', 'string'],
    [true, 'boolean'],
    [Symbol('a'), 'symbol'],
    [1n, 'bigint'],
  ] as const) {
    const displayableValue = typeof input === 'string' ? `"${input}"` : String(input);

    it(`for non-objects, returns the usual typeof value; e.g.: "${expected}" for ${displayableValue}`, () => {
      const actual = preciseTypeOf(input);
      expect(actual).toBe(expected);
    });
  }
});
