import { assertEquals, describe, it } from '../../dev_deps.ts';

import { map } from '../map.ts';

describe('map()', () => {
  it('applies a function to each item in an array and returns a new array', () => {
    const fn = (x: number) => x * 2;
    const mapper = map(fn);
    const input = [1, 2, 3];
    const expected = [2, 4, 6];

    const actual = mapper(input);

    assertEquals(actual, expected);
  });

  it('passes the index to the provided function', () => {
    const fn = (x: number, index: number) => x + index;
    const mapper = map(fn);
    const input = [10, 10, 10];
    const expected = [10, 11, 12];

    const actual = mapper(input);

    assertEquals(actual, expected);
  });

  it('returns an empty array when given an empty array', () => {
    const fn = (x: number) => x * 2;
    const mapper = map(fn);
    const input: never[] = [];
    const expected: never[] = [];

    const actual = mapper(input);

    assertEquals(actual, expected);
  });

  it('works with various types, not just numbers', () => {
    const fn = (x: string, index: number) => `${x}-${index}`;
    const mapper = map(fn);
    const input = ['a', 'b', 'c'];
    const expected = ['a-0', 'b-1', 'c-2'];

    const actual = mapper(input);

    assertEquals(actual, expected);
  });
});
