import { describe, expect, it } from 'vitest';

import { TypedObject } from '../TypedObject.v1.ts';

describe(TypedObject, () => {
  describe('static entries()', () => {
    it('returns type-safe Object.entries', () => {
      const input = { a: 1, b: 2 } as const;
      // @ts-expect-error - Keys returned by `Object.entries` are always of type `string`
      const expected: ['a' | 'b', 1 | 2][] = Object.entries(input);

      const actual: ['a' | 'b', 1 | 2][] = TypedObject.entries(input);

      expect(actual).toStrictEqual(expected);
    });

    it('handles an object lacking a string index', () => {
      const input: Record<'a' | 'b', number> = { a: 1, b: 2 };
      const expected = Object.entries(input);

      const actual: ['a' | 'b', number][] = TypedObject.entries(input);

      expect(actual).toStrictEqual(expected);
    });

    it('handles an empty object', () => {
      const input = {};
      const expected = Object.entries(input);

      const actual = TypedObject.entries(input);

      expect(actual).toStrictEqual(expected);
    });

    it('handles a string', () => {
      const expected = Object.entries('abc');

      const actual: [string, string][] = TypedObject.entries('abc');

      expect(actual).toStrictEqual(expected);
    });

    it('handles an array', () => {
      const input: ReadonlyArray<1 | 2> = [1, 2] as const;
      const expected = Object.entries(input);

      const actual: [string, 1 | 2][] = TypedObject.entries(input);

      expect(actual).toStrictEqual(expected);
    });

    it('treats numeric keys as undifferentiated strings', () => {
      const input = {
        1: 'a', // treated as a string in output type
        num1: 1,
        num2: 2,
      };
      const expectedEntries = [
        ['1', 'a'],
        ['num1', 1],
        ['num2', 2],
      ];

      const nativeEntries = Object.entries(input);
      // @ts-expect-error - Implementation succeeds, but method does not support numeric keys at compile time
      const actualEntries = TypedObject.entries(input);

      expect(nativeEntries).toStrictEqual(expectedEntries);
      expect(actualEntries).toStrictEqual(expectedEntries);
    });

    it('handles an object with symbols as keys', () => {
      const symbolKey = Symbol('key');
      const input = {
        [symbolKey]: 'value',
        num1: 1,
        num2: 2,
      };
      const expectedEntries = [
        ['num1', 1],
        ['num2', 2],
      ];

      const nativeEntries = Object.entries(input);
      const actualEntries: ['num1' | 'num2', number][] = TypedObject.entries(input);

      expect(nativeEntries).toStrictEqual(expectedEntries);
      expect(actualEntries).toStrictEqual(expectedEntries);
    });

    it('given a function, throws an error', () => {
      const input = () => {};

      const throwingFn = () => TypedObject.entries(input);

      expect(throwingFn).toThrow(new TypeError('Method does not support functions. Use Object.entries instead.'));
    });

    it('given a class, throws an error', () => {
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class TestClass {}
      const input = TestClass;

      const throwingFn = () => TypedObject.entries(input);

      expect(throwingFn).toThrow(new TypeError('Method does not support functions. Use Object.entries instead.'));
    });

    it('given an invalid value, throws an error', () => {
      // @ts-expect-error - `Object.entries` does not accept `null`
      expect(() => TypedObject.entries(null)).toThrow(new TypeError('Cannot convert undefined or null to object'));
      // @ts-expect-error - `Object.entries` does not accept `undefined`
      expect(() => TypedObject.entries()).toThrow('def');
    });

    it('given an object without a prototype, throws an error', () => {
      const input = Object.create(null);

      const throwingFn = () => TypedObject.entries(input);

      expect(throwingFn).toThrow(
        new Error('Method does not support objects with no prototype. Use Object.entries instead.'),
      );
    });
  });

  describe('static fromEntries()', () => {
    it('returns type-safe Object.fromEntries', () => {
      const input = [
        ['a', 1],
        ['b', 2],
      ] as const;
      const expected = Object.fromEntries(input);

      const actual = TypedObject.fromEntries(input);

      expect(actual).toStrictEqual(expected);
    });
  });
});
