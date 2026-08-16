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

  it('if input is not an array, returns that value in an array', () => {
    const input = 1;
    const expectedOutput = [input];

    const output = arraify(input);

    expect(output).toStrictEqual(expectedOutput);
    expectTypeOf(output).toEqualTypeOf<number[]>();
  });
});
