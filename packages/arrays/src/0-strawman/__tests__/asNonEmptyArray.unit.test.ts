import { describe, expect, it } from 'vitest';

import { asNonEmptyArray, assertFrozenArray, assertNonEmptyArray } from '../asNonEmptyArray.ts';

describe(asNonEmptyArray, () => {
  it('if the array is non-empty and immutable, returns it', () => {
    const items = Object.freeze(['item']);

    const result = asNonEmptyArray(items);

    expectNonEmpty(result);
    expect(result).toHaveLength(1);
    expect(result).toStrictEqual(items);
  });

  it('if the array is non-empty and mutable, returns an immutable copy', () => {
    const items = ['item'];

    const result = asNonEmptyArray(items);

    expectNonEmpty(result);
    expect([...result]).toStrictEqual(items);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('returns an array that cannot be mutated', () => {
    const items = ['item'];
    const immutableItems = asNonEmptyArray(items);

    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    // @ts-expect-error - Not compilable: An immutable array does not have a `push` method
    const throwingFn = () => immutableItems.push('cannot be added');
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-return */

    expect(throwingFn).toThrowError(/Cannot add property 1, object is not extensible/);
  });

  it('if the array is empty, throws an error', () => {
    const throwingFn = () => asNonEmptyArray([]);

    expect(throwingFn).toThrowError(new Error('Invalid input. Array cannot be empty.'));
  });

  it('accepts a tuple', () => {
    const items = ['item'] as const;

    const result = asNonEmptyArray(items);

    expectNonEmpty(result);
    expect(result).toStrictEqual(items);
  });

  it('accepts a read-only array', () => {
    const items: readonly string[] = ['item'];

    const result = asNonEmptyArray(items);

    expect(result).toStrictEqual(items);
  });
});

describe(assertFrozenArray, () => {
  it('if array is read-only but not immutable, succeeds at compile-time but fails at runtime', () => {
    const mutableItems: readonly string[] = ['item'];

    const throwingFn = () => assertFrozenArray(mutableItems); // no compilation error

    expect(throwingFn).toThrowError(new Error('Invalid input. Array cannot be mutable.'));
  });

  it('guarantees immunity from side effects', () => {
    function expectFrozenArray(items: ReadonlyArray<string>): void {
      // `items` is declared to be read-only in this function, but is not frozen
      assertFrozenArray(items);
      // This code is unreachable because the assertion throws an error
    }

    const throwingFn = () => expectFrozenArray(['item']);

    expect(throwingFn).toThrowError(new Error('Invalid input. Array cannot be mutable.'));
  });
});

describe(assertNonEmptyArray, () => {
  it('if array is immutable and non-empty, narrows the type', () => {
    const items = Object.freeze([1]);

    assertNonEmptyArray(items);

    // Compilable: The array has a length (has not been narrowed to `never`)
    expect(items).toHaveLength(1);

    /* eslint-disable @typescript-eslint/no-unsafe-call */
    /* eslint-disable @typescript-eslint/no-unsafe-return */
    // @ts-expect-error - A read-only array has no `pop` method
    const throwingFn = () => items.pop();
    /* eslint-enable @typescript-eslint/no-unsafe-call */
    /* eslint-enable @typescript-eslint/no-unsafe-return */

    expect(throwingFn).toThrowError(/Cannot delete property/);
  });

  it('if array is immutable and empty, throws an error', () => {
    const items = Object.freeze([]);

    const throwingFn = () => assertNonEmptyArray(items);

    expect(throwingFn).toThrowError(new Error('Invalid input. Array cannot be empty.'));
  });

  // eslint-disable-next-line vitest/expect-expect
  it('if array is immutable, fails to compile', () => {
    const mutableItems = ['item'];

    // The following assertion fails at compile-time but succeeds at runtime.
    // Only a frozen array is guaranteed to be immutable.
    // @ts-expect-error - Mutable array is not valid input
    assertNonEmptyArray(mutableItems);
  });

  it('does not guarantees immunity from side effects', () => {
    // Array is mutable in the scope of this function
    const items = [1];

    ((array: ReadonlyArray<unknown>, pushToArray: () => void): void => {
      const copy = [...array];
      assertNonEmptyArray(array);

      // Even though the array is read-only to this function, it can still be mutated elsewhere
      expect([...array]).toStrictEqual([...copy]);
      pushToArray();
      expect([...array]).not.toStrictEqual([...copy]);
    })(items, () => items.push(2));
  });
});

// Function to test TypeScript's ability to narrow a value's type to a non-empty array
function expectNonEmpty<T>(firstItem: T, ...otherItems: T[]): Readonly<[T, ...T[]]> {
  return [firstItem, ...otherItems];
}
