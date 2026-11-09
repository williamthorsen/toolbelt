import { describe, expect, expectTypeOf, it } from 'vitest';

import { curry } from '../curry.ts';

describe(curry, () => {
  describe('basic currying', () => {
    it('curries a function taking two arguments', () => {
      const add = (a: number, b: number) => a + b;
      const curriedAdd = curry(add);
      expect(curriedAdd(1)(2)).toBe(3);
    });

    it('curries a function taking three arguments', () => {
      const sum = (a: number, b: number, c: number) => a + b + c;
      const curriedSum = curry(sum);
      expect(curriedSum(1)(2)(3)).toBe(6);
    });
  });

  describe('returning curried function', () => {
    it('returns another curried function if not all args are provided', () => {
      const sum = (a: number, b: number, c: number) => a + b + c;
      const curriedSum = curry(sum);
      const partialSum = curriedSum(1);
      expect(partialSum).toBeInstanceOf(Function);
      expect(partialSum(2)(3)).toBe(6);
    });
  });

  describe('types', () => {
    it('types each partial application as taking the next argument', () => {
      const add = (a: number, b: number) => a + b;

      expectTypeOf(curry(add)(1)).toEqualTypeOf<(arg: number) => number>();
    });

    it('rejects an argument of the wrong type', () => {
      const add = (a: number, b: number) => a + b;

      // @ts-expect-error - `add` takes a number as its first argument
      expect(() => curry(add)('1')).not.toThrow();
    });
  });
});
