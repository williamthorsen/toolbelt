import vm from 'node:vm';

import { describe, expect, expectTypeOf, it } from 'vitest';

import { arraify } from '../arraify.ts';

describe(arraify, () => {
  it('if input is an array, returns a copy of the array', () => {
    const input = [1, 2, 3];
    const expectedOutput = [...input];

    const output = arraify(input);

    expect(output).toStrictEqual(expectedOutput);
    expect(output).not.toBe(input);
    expectTypeOf(output).toEqualTypeOf<number[]>();
  });

  // Only `Array.isArray` recognizes an array whose prototype comes from another realm.
  it('copies an array constructed in another realm', () => {
    const input: unknown = vm.runInNewContext('[1, 2, 3]');

    expect(arraify(input)).toStrictEqual([1, 2, 3]);
  });

  it('if input is not an array, returns that value in an array', () => {
    const input = 1;
    const expectedOutput = [input];

    const output = arraify(input);

    expect(output).toStrictEqual(expectedOutput);
    expectTypeOf(output).toEqualTypeOf<number[]>();
  });
});
