import { describe, expect, expectTypeOf, it } from 'vitest';

import { hasOwnProperty } from '../hasOwnProperty.ts';

describe(hasOwnProperty, () => {
  it('returns true if the object has the property', () => {
    const target = { a: 'a' };

    expect(hasOwnProperty(target, 'a')).toBe(true);
  });

  it('if the object does not have the property, returns false', () => {
    const target = { a: 'a' };

    expect(hasOwnProperty(target, 'b')).toBe(false);
  });

  it('if the object is an array and the key is an initialized index, returns true', () => {
    const target = ['a', undefined];

    expect(hasOwnProperty(target, '0')).toBe(true);
    expect(hasOwnProperty(target, '1')).toBe(true);
  });

  it('if the object is an array and the key is an uninitialized index, returns false', () => {
    const target = ['a'];

    expect(hasOwnProperty(target, '1')).toBe(false);
  });

  it('accepts a function as target', () => {
    function target() {}
    target.a = 'a';

    expect(hasOwnProperty(target, 'a')).toBe(true);
  });

  it('accepts an array as target', () => {
    const target: Array<string> & { a?: string } = ['value'];
    target.a = 'a';

    expect(hasOwnProperty(target, 'a')).toBe(true);
  });

  it('if the property is inherited, returns false', () => {
    const targetsAndProperties = [
      [Object.create({ a: 'a' }), 'a'],
      ['string', 'toString'],
    ];

    for (const [target, property] of targetsAndProperties) {
      expect(hasOwnProperty(target, property)).toBe(false);
    }
  });

  // eslint-disable-next-line vitest/prefer-each
  for (const value of [null, undefined, 1, true, Symbol('a')]) {
    it(`if the target is ${typeof value}, returns false`, () => {
      expect(hasOwnProperty(value, 'a')).toBe(false);
    });
  }

  it('accepts any non-object value as input', () => {
    for (const value of [null, undefined, 1, true, Symbol('a')]) {
      expect(() => hasOwnProperty(value, 'key')).not.toThrow();
    }
  });

  it('correctly narrows the type', () => {
    const nDict = { n: 1 };
    const sDict = { s: 's' };
    function fn(value: { n: number }): number;
    function fn(value: { s: string }): string;
    function fn(value: { n: number } | { s: string }): boolean | number | string {
      // These lines will not compile unless the type is correctly narrowed.
      if (hasOwnProperty(value, 'n')) {
        return value.n;
      }
      if (hasOwnProperty(value, 's')) {
        return value.s;
      }
      return false;
    }
    expectTypeOf(fn(nDict)).toEqualTypeOf<number>();
    expectTypeOf(fn(sDict)).toEqualTypeOf<string>();
  });

  it('can infer type when the key type is a superset of the object keys', () => {
    type Key = 'a' | 'b' | 'c';

    const dict: Record<'a' | 'b', string> = { a: 'a', b: 'b' }; // keys are only a subset of `Key`

    function getValueOrEmpty(key: Key): string {
      return hasOwnProperty(dict, key) ? dict[key] : '';
    }
    expect(getValueOrEmpty('a')).toBe('a');
  });
});
