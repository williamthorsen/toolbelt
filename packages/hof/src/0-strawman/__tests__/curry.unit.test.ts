import { assertEquals, describe, it } from '../../dev_deps.ts';
import { curry } from '../curry.ts';

describe('curry()', () => {
  describe('basic currying', () => {
    it('curries a function taking two arguments', () => {
      const add = (a: number, b: number) => a + b;
      const curriedAdd = curry(add);
      assertEquals(curriedAdd(1)(2), 3);
    });

    it('curries a function taking three arguments', () => {
      const sum = (a: number, b: number, c: number) => a + b + c;
      const curriedSum = curry(sum);
      assertEquals(curriedSum(1)(2)(3), 6);
    });
  });

  describe('returning curried function', () => {
    it('returns another curried function if not all args are provided', () => {
      const sum = (a: number, b: number, c: number) => a + b + c;
      const curriedSum = curry(sum);
      const partialSum = curriedSum(1);
      assertEquals(typeof partialSum, 'function');
      assertEquals(partialSum(2)(3), 6);
    });
  });
});
