import { describe, expect, it } from 'vitest';

import { deepSetsToArrays } from '../deepSetsToArrays.ts';

describe(deepSetsToArrays, () => {
  it('returns the same value for non-objects', () => {
    expect(deepSetsToArrays(1)).toBe(1);
    expect(deepSetsToArrays('test')).toBe('test');
    expect(deepSetsToArrays(true)).toBe(true);
    expect(deepSetsToArrays(null)).toBeNull();
    expect(deepSetsToArrays(undefined)).toBeUndefined();
  });

  it('given a set, converts it to a sorted array', () => {
    const set = new Set([3, 1, 2]);
    const expected = [1, 2, 3];

    const actual = deepSetsToArrays(set);

    expect(actual).toStrictEqual(expected);
  });

  it('given an array of sets, converts it to an array of sorted arrays', () => {
    const arrayOfSets = [new Set([3, 1, 2]), new Set(['b', 'c', 'a'])];
    const expected = [
      [1, 2, 3],
      ['a', 'b', 'c'],
    ];

    const actual = deepSetsToArrays(arrayOfSets);

    expect(actual).toStrictEqual(expected);
  });

  it('converts sets in nested sets', () => {
    const setOfSets = new Set([new Set([3, 1, 2]), new Set(['b', 'c', 'a'])]);
    const expected = [
      [1, 2, 3],
      ['a', 'b', 'c'],
    ];

    const actual = deepSetsToArrays(setOfSets);

    expect(actual).toStrictEqual(expected);
  });

  it('given an object, returns the result of calling deepSetsToArrays on all its values', () => {
    const withSets = { num: new Set([3, 1, 2]), str: new Set(['b', 'c', 'a']) };
    const expected = { num: [1, 2, 3], str: ['a', 'b', 'c'] };

    const actual = deepSetsToArrays(withSets);

    expect(actual).toStrictEqual(expected);
  });

  it('converts sets in nested objects', () => {
    const withSets = {
      num: {
        numChild: new Set([3, 1, 2]),
      },
      str: {
        strChild: {
          strGrandChild: new Set(['b', 'c', 'a']),
        },
      },
    };
    const expected = {
      num: {
        numChild: [1, 2, 3],
      },
      str: {
        strChild: {
          strGrandChild: ['a', 'b', 'c'],
        },
      },
    };

    const actual = deepSetsToArrays(withSets);

    expect(actual).toStrictEqual(expected);
  });

  it('sorts set members in ascending order', () => {
    const withSets = { num: new Set([3, 1, 2]), str: new Set(['b', 'c', 'a']) };
    const expected = { num: [1, 2, 3], str: ['a', 'b', 'c'] };

    const actual = deepSetsToArrays(withSets);

    expect(actual).toStrictEqual(expected);
  });

  // A built-in instance has no own enumerable keys, so `Object.entries` yields nothing to carry over.
  it('reduces a built-in instance to an empty object', () => {
    expect(deepSetsToArrays(new Date())).toStrictEqual({});
  });

  it('returns a function unchanged', () => {
    const fn = () => {};
    expect(deepSetsToArrays(fn)).toBe(fn);
  });
});
