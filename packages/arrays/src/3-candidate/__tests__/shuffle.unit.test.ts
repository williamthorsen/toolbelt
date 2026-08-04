import { SeededRng } from '@williamthorsen/toolbelt.numbers/candidate';
import { describe, expect, it } from 'vitest';

import { shuffle, shuffleInPlace } from '../shuffle.ts';

describe(shuffle, () => {
  it('if given an empty array, returns an equivalent empty array', () => {
    const original: number[] = [];

    const shuffled = shuffle(original);

    expect(shuffled).not.toBe(original);
    expect(shuffle([])).toStrictEqual([]);
  });

  it('if given a single-item array, returns an equivalent single-item array', () => {
    expect(shuffle([1])).toStrictEqual([1]);
  });

  it('if given a multi-item array, returns a new array with the same contents', () => {
    const original = [1, 2, 3];

    const shuffled = shuffle(original);

    expect(shuffled).not.toBe(original);
    expect(shuffled).toHaveLength(original.length);
    expect(shuffled).toContain(1);
    expect(shuffled).toContain(2);
    expect(shuffled).toContain(3);
  });
});

describe(shuffleInPlace, () => {
  it('does not throw error when given empty array', () => {
    expect(() => {
      shuffleInPlace([]);
    }).not.toThrow();
  });

  it('does not modify array when given single-item array', () => {
    const array = [1];

    shuffleInPlace(array);

    expect(array).toStrictEqual([1]);
  });

  it('modifies array in place when given multi-item array', () => {
    const array = [1, 2, 3];
    const original = [...array];

    shuffleInPlace(array);

    expect(array).toHaveLength(original.length);
    expect(array).toContain(1);
    expect(array).toContain(1);
    expect(array).toContain(2);
    expect(array).toContain(3);
  });

  it('given a seed, deterministically shuffles the array', () => {
    const original = [1, 2, 3];
    const duplicate = [...original];

    shuffleInPlace(original, { seed: 1_234 });
    shuffleInPlace(duplicate, { seed: 1_234 });

    expect(original).toStrictEqual(duplicate);
  });

  it('given a SeededRng instance with a given seed, deterministically shuffles the ray', () => {
    // This snapshot is intended to confirm that, despite any code changes, seeds produce consistent results.
    const seedFn1 = new SeededRng(1_234.5).rng;
    const seedFn2 = new SeededRng(1_234.5).rng;
    const original = [1, 2, 3, 4, 5];
    const duplicate = [...original];
    const snapshot = [5, 1, 3, 2, 4];

    shuffleInPlace(original, { seed: seedFn1 });
    shuffleInPlace(duplicate, { seed: seedFn2 });

    expect(original).toStrictEqual(duplicate);
    expect(original).toStrictEqual(snapshot);
  });
});
