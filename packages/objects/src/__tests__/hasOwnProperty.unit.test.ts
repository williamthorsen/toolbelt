import { describe, expect, it } from 'vitest';

import { hasOwnProperty } from '../hasOwnProperty.js';

describe('hasOwnProperty()', () => {
  // Functions to test that an inferred type is correct.
  /* eslint-disable unicorn/consistent-function-scoping */
  function numberFn(_value: number): void {}
  function stringFn(_value: string): void {}
  /* eslint-enable unicorn/consistent-function-scoping */

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
    // eslint-disable-next-line unicorn/consistent-function-scoping
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
    // eslint-disable-next-line unicorn/consistent-function-scoping
    function fn(value: { n: number } | { s: string }): void {
      // These lines will not compile unless the type is correctly narrowed.
      /* eslint-disable @typescript-eslint/no-unused-expressions */
      hasOwnProperty(value, 'n') && numberFn(value.n);
      hasOwnProperty(value, 's') && stringFn(value.s);
      /* eslint-enable @typescript-eslint/no-unused-expressions */
    }
    fn(nDict);
    fn(sDict);
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
