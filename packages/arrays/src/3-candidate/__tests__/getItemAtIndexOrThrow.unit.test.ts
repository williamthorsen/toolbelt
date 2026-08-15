import { describe, expect, it } from 'vitest';

import { getItemAtIndexOrThrow } from '../getItemAtIndexOrThrow.ts';

describe(getItemAtIndexOrThrow, () => {
  it('returns the item at the index', () => {
    expect(getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], 2)).toBe('c');
  });

  it('returns the first item', () => {
    expect(getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], 0)).toBe('a');
  });

  it('returns the last item', () => {
    expect(getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], 3)).toBe('d');
  });

  it('returns a falsy item rather than treating it as absent', () => {
    expect(getItemAtIndexOrThrow([0, 1], 0)).toBe(0);
    expect(getItemAtIndexOrThrow([null], 0)).toBeNull();
  });

  it('returns an item whose value is undefined rather than treating it as absent', () => {
    expect(getItemAtIndexOrThrow<string | undefined>(['a', undefined], 1)).toBeUndefined();
  });

  it('if the index is past the end, throws a RangeError naming the index and the length', () => {
    const throwingFn = () => getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], 4);

    expect(throwingFn).toThrow(new RangeError('No item at index 4 of an array of length 4.'));
  });

  it('if the index is negative, throws a RangeError rather than resolving it from the end', () => {
    const throwingFn = () => getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], -1);

    expect(throwingFn).toThrow(new RangeError('No item at index -1 of an array of length 4.'));
  });

  it('if the array is empty, throws a RangeError', () => {
    const throwingFn = () => getItemAtIndexOrThrow([], 0);

    expect(throwingFn).toThrow(new RangeError('No item at index 0 of an array of length 0.'));
  });

  it('if the index names a hole, throws a RangeError rather than returning undefined', () => {
    // Setting `length` leaves genuine holes, which `Array.from` would fill with undefined.
    const sparse: string[] = [];
    sparse.length = 3;

    const throwingFn = () => getItemAtIndexOrThrow(sparse, 1);

    expect(throwingFn).toThrow(new RangeError('No item at index 1 of an array of length 3.'));
  });

  it('if the index is fractional, throws a TypeError rather than truncating it', () => {
    const throwingFn = () => getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], 0.5);

    expect(throwingFn).toThrow(new TypeError('Index must be a safe integer, but received 0.5.'));
  });

  it('if the index is NaN, throws a TypeError', () => {
    const throwingFn = () => getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], NaN);

    expect(throwingFn).toThrow(new TypeError('Index must be a safe integer, but received NaN.'));
  });

  it('if the index is infinite, throws a TypeError', () => {
    const throwingFn = () => getItemAtIndexOrThrow(['a', 'b', 'c', 'd'], Infinity);

    expect(throwingFn).toThrow(new TypeError('Index must be a safe integer, but received Infinity.'));
  });
});
