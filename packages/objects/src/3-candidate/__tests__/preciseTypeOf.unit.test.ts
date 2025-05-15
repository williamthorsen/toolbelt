import { assertEquals, describe, it } from '../../dev_deps.ts';
import { preciseTypeOf } from '../preciseTypeOf.ts';

describe('preciseTypeOf()', () => {
  it('returns "null" for null', () => {
    const input = null;
    const expectedOutput = 'null';

    const actualOutput = preciseTypeOf(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('returns "array" for arrays', () => {
    const input = [1, 2, 3];
    const expectedOutput = 'array';

    const actualOutput = preciseTypeOf(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('returns "plainobject" for plain objects', () => {
    const input = { a: 1, b: 2, c: 3 };
    const expectedOutput = 'plainobject';

    const actualOutput = preciseTypeOf(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('returns "instance" for instances of built-in classes', () => {
    class TestClass {}
    const input = new TestClass();
    const expectedOutput = 'instance';

    const actualOutput = preciseTypeOf(input);

    assertEquals(actualOutput, expectedOutput);
  });

  it('returns "instance" for instances of custom classes', () => {
    class TestClass {}
    const input = new TestClass();
    const expectedOutput = 'instance';

    const actualOutput = preciseTypeOf(input);

    assertEquals(actualOutput, expectedOutput);
  });

  for (const [input, expected] of [
    [undefined, 'undefined'],
    [() => {}, 'function'],
    [1, 'number'],
    ['a', 'string'],
    [true, 'boolean'],
    [Symbol('a'), 'symbol'],
    [1n, 'bigint'],
  ] as const) {
    const displayableValue = typeof input === 'string' ? `"${input}"` : String(input);
    it(`for non-objects, returns the usual typeof value; e.g.: "${expected}" for ${displayableValue}`, () => {
      const actual = preciseTypeOf(input);
      assertEquals(actual, expected);
    });
  }
});
