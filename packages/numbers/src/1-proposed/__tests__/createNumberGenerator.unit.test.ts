import { describe, expect, it } from 'vitest';

import { SeededRng } from '../../3-candidate/seeded-rng.ts';
import { createNumberGenerator } from '../createNumberGenerator.ts';

describe(createNumberGenerator, () => {
  it('returns a function', () => {
    const generator = createNumberGenerator();
    expect(generator).toBeInstanceOf(Function);
  });

  it('given the same seed, returns the same series of numbers', () => {
    const generator1 = createNumberGenerator(1);
    const generator2 = createNumberGenerator(1);

    const values1 = [generator1(), generator1(), generator1()];
    const values2 = [generator2(), generator2(), generator2()];

    expect(generator1).not.toBe(generator2);
    expect(values1).toStrictEqual(values2);
  });

  it('given a number generator created with the same seed, returns the same series of number', () => {
    const generator1 = createNumberGenerator(new SeededRng(1234).rng);
    const generator2 = createNumberGenerator(new SeededRng(1234).rng);

    const values1 = [generator1(), generator1(), generator1()];
    const values2 = [generator2(), generator2(), generator2()];

    expect(generator1).not.toBe(generator2);
    expect(values1).toStrictEqual(values2);
  });

  it('returns different value for different seed', () => {
    const generator1 = createNumberGenerator(1);
    const generator2 = createNumberGenerator(2);

    expect(generator1()).not.toBe(generator2());
  });

  it('returns values within the [0, -1) range', () => {
    const generator = createNumberGenerator(1);

    const result = generator();

    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThan(1);
  });
});
