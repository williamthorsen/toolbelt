import { assertEquals, describe, it } from '../../dev_deps.ts';

import { sortKeys, sortObjectKeys } from '../sort-keys.ts';

describe('sortKeys()', () => {
  it('sorts keys in a flat object', () => {
    const input = { z: 1, a: 2, m: 3 };
    const expectedOutput = { a: 2, m: 3, z: 1 };

    const actualOutput = sortKeys(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('does not try to sort the keys of objects other than plain objects', () => {
    const input = new Date();
    const expectedOutput = input;

    // deno-lint-ignore no-explicit-any
    const actualOutput = sortKeys(input as any);

    assertEquals(actualOutput, expectedOutput);
  });

  it('sorts with a custom compare function', () => {
    const input = { z: 1, a: 2, m: 3 };
    const expectedOutput = { z: 1, m: 3, a: 2 };
    const compare = (keyA: string, keyB: string) => keyB.localeCompare(keyA);

    const actualOutput = sortKeys(input, compare);

    assertEquals(actualOutput, expectedOutput);
  });
});

describe('sortObjectKeys()', () => {
  it('sorts keys in a flat object', () => {
    const input = { z: 1, a: 2, m: 3 };
    const expectedOutput = { a: 2, m: 3, z: 1 };

    const actualOutput = sortObjectKeys(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('recursively sorts keys in nested objects', () => {
    const input = { z: 1, a: 2, m: { y: 1, b: 2 } };
    const expectedOutput = { a: 2, m: { b: 2, y: 1 }, z: 1 };

    const actualOutput = sortObjectKeys(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('recursively sorts keys in objects within nested arrays', () => {
    const input = {
      z: 1,
      a: [
        { z: 3, a: 1 },
        { y: 2, x: 3 },
      ],
      m: 3,
    };
    const expectedOutput = {
      a: [
        { a: 1, z: 3 },
        { x: 3, y: 2 },
      ],
      m: 3,
      z: 1,
    };

    const actualOutput = sortObjectKeys(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('does not try to sort the keys of objects other than plain objects', () => {
    const date = new Date();
    const input = { z: 1, a: 2, m: date };
    const expectedOutput = { a: 2, m: date, z: 1 };

    const actualOutput = sortObjectKeys(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('sorts with custom compare function', () => {
    const input = { z: 1, a: 2, m: 3 };
    const expectedOutput = { z: 1, m: 3, a: 2 };
    const customCompareFn = (keyA: string, keyB: string) => keyB.localeCompare(keyA);

    const actualOutput = sortObjectKeys(input, customCompareFn);

    assertEquals(actualOutput, expectedOutput);
  });
});
