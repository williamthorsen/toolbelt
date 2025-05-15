import { assertEquals, assertNotStrictEquals, describe, it } from '../../dev_deps.ts';
import { omitNullish, omitUndefined } from '../omit-nullish.ts';

describe('omitNullish()', () => {
  it('removes properties with null or undefined values', () => {
    const obj = { a: 1, b: undefined, c: null, d: 3 };
    const expected = { a: 1, d: 3 };

    const actual = omitNullish(obj);

    assertEquals(actual, expected);
  });

  it('returns an empty object when all properties are null or undefined', () => {
    const obj = { a: undefined, b: null };
    const expected = {};

    const actual = omitNullish(obj);

    assertEquals(actual, expected);
  });

  it('returns an identical object when no properties are null or undefined', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const expected = { a: 1, b: 2, c: 3 };

    const actual = omitNullish(obj);

    assertEquals(actual, expected);
  });

  it('returns an identical object for an empty input object', () => {
    const obj = {};
    const expected = {};

    const actual = omitNullish(obj);

    assertNotStrictEquals(actual, obj);
    assertEquals(actual, expected);
  });

  it('given a class instance, returns an object literal containing its non-nullish properties', () => {
    class MyClass {
      a = 1;
      b = undefined;
      c = null;
      fn(): void {}
    }
    const instance = new MyClass();
    const expected = { a: 1 };

    const actual = omitNullish(instance);

    assertEquals(actual, expected);
  });
});

describe('omitUndefined()', () => {
  it('removes properties with undefined values', () => {
    const obj = { a: 1, b: undefined, c: 3 };
    const expected = { a: 1, c: 3 };

    const actual = omitUndefined(obj);

    assertEquals(actual, expected);
  });

  it('does not modify properties with null values', () => {
    const obj = { a: 1, b: null, c: 3 };
    const expected = { a: 1, b: null, c: 3 };

    const actual = omitUndefined(obj);

    assertEquals(actual, expected);
  });

  it('returns an empty object when all properties are undefined', () => {
    const obj = { a: undefined, b: undefined };
    const expected = {};

    const actual = omitUndefined(obj);

    assertEquals(actual, expected);
  });

  it('returns an identical object when no properties are undefined', () => {
    const obj = { a: 1, b: 2, c: 3 };
    const expected = { a: 1, b: 2, c: 3 };

    const actual = omitUndefined(obj);

    assertEquals(actual, expected);
  });

  it('returns an identical object for an empty input object', () => {
    const obj = {};
    const expected = {};

    const actual = omitUndefined(obj);

    assertNotStrictEquals(actual, obj);
    assertEquals(actual, expected);
  });

  it('given a class instance, returns an object literal containing its defined properties', () => {
    class MyClass {
      a = 1;
      b = undefined;
      fn(): void {}
    }
    const instance = new MyClass();
    const expected = { a: 1 };

    const actual = omitUndefined(instance);

    assertEquals(actual, expected);
  });
});
