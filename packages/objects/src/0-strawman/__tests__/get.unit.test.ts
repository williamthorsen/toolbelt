import { assertEquals, describe, it } from '../../dev_deps.ts';
import { get } from '../get.ts';

describe('get()', () => {
  it('retrieves the value for the given key from the object', () => {
    const key = 'a';
    const obj = { a: 'apple', b: 'banana' };
    const getKey = get(key);

    const expected = 'apple';
    const actual = getKey(obj);

    assertEquals(actual, expected);
  });

  it('narrows the type to exclude undefined when undefined is not allowed', () => {
    const key = 'items';
    const obj: { items: string[] } = { items: ['apple'] };

    const value = get(key)(obj);

    // `value.length` raises no type error because the return type is correctly constrained to `string[]`.
    assertEquals(value.length, 1);
  });

  it('returns undefined for a nonexistent key', () => {
    const key = 'b';
    const obj: { a: string; b?: string } = { a: 'apple' };
    const expected = undefined;

    const actual = get(key)(obj);

    assertEquals(actual, expected);
  });

  it('handles nested objects', () => {
    const key = 'inner';
    const obj = { outer: 'egg', inner: { a: 'apple', b: 'banana' } };
    const expected = { a: 'apple', b: 'banana' };

    const actual = get(key)(obj);

    assertEquals(actual, expected);
  });

  describe('with default value', () => {
    const defaultValue = 'avocado';
    const getA = get('a', defaultValue);

    it('if the property has a value, uses the value', () => {
      const obj: { a?: string | undefined; b: string } = { a: 'apple', b: 'banana' };
      const expected = 'apple';

      const actual = getA(obj);

      assertEquals(actual, expected);
    });

    it('if the property does not exist, uses the default value', () => {
      const obj: { a?: string; b: string } = { b: 'banana' };
      const expected = defaultValue;

      const actual = getA(obj);

      assertEquals(actual, expected);
    });

    it('if the property is undefined, uses the default value', () => {
      const obj: { a?: string | undefined; b: string } = { a: undefined, b: 'banana' };
      const expected = defaultValue;

      const actual = getA(obj);

      assertEquals(actual, expected);
    });

    it('the default value must be of the same type as the property', () => {
      const obj: { a: string | undefined } = { a: 'apple' };

      // @ts-expect-error Default value of `undefined` is not assignable to property of type 'string'.
      const actual = get('a', undefined)(obj);

      assertEquals(actual, 'apple');
    });
  });
});
