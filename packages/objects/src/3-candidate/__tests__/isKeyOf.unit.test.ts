import { describe, expect, it } from 'vitest';

import { isKeyOf } from '../isKeyOf.ts';

describe(isKeyOf, () => {
  it('returns true when key exists as own property', () => {
    const obj = { name: 'John', age: 30 };
    const key = 'name';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('returns false when key does not exist', () => {
    const obj = { name: 'John', age: 30 };
    const key = 'height';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(false);
  });

  it('returns false when key exists only in prototype chain', () => {
    const obj: { own?: string } = Object.create({ inherited: 'value' });
    obj.own = 'ownValue';
    const key = 'inherited';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(false);
  });

  it('returns true for numeric string keys on objects', () => {
    const obj = { 0: 'first', 1: 'second' };
    const key = '0';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('returns true for numeric keys on arrays', () => {
    const obj = ['a', 'b', 'c'];
    const key = 1;

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('returns false for out-of-bounds numeric keys on arrays', () => {
    const obj = ['a', 'b', 'c'];
    const key = 5;

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(false);
  });

  it('returns true for symbol keys', () => {
    const symbolKey = Symbol('test');
    const obj = { [symbolKey]: 'value', regular: 'property' };

    const actual = isKeyOf(symbolKey, obj);

    expect(actual).toBe(true);
  });

  it('returns false for non-existent symbol keys', () => {
    const obj = { regular: 'property' };
    const key = Symbol('nonExistent');

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(false);
  });

  it('works with empty objects', () => {
    const obj = {};
    const key = 'any';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(false);
  });

  it('works with objects having undefined values', () => {
    const obj = { definedKey: 'value', undefinedKey: undefined };
    const key = 'undefinedKey';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('works with objects having null values', () => {
    const obj = { nullKey: null, normalKey: 'value' };
    const key = 'nullKey';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('handles class instances with own properties', () => {
    class TestClass {
      public instanceProp = 'instance';
    }
    const obj = new TestClass();
    const key = 'instanceProp';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('returns false for class methods (prototype properties)', () => {
    class TestClass {
      public instanceProp = 'instance';
      public method() {
        return 'method';
      }
    }
    const obj = new TestClass();
    const key = 'method';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(false);
  });

  it('works with Record types', () => {
    const obj: Record<string, number> = { a: 1, b: 2, c: 3 };
    const key = 'b';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });

  it('works with objects having index signatures', () => {
    interface IndexableObject {
      [key: string]: unknown;
      fixedProp: string;
    }

    const obj: IndexableObject = { fixedProp: 'fixed', dynamicProp: 'dynamic' };
    const key = 'dynamicProp';

    const actual = isKeyOf(key, obj);

    expect(actual).toBe(true);
  });
});
