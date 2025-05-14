/* eslint-disable vitest/prefer-each */

import { describe, expect, it, vi } from 'vitest';

import type { Seed, SeededGenerator } from '../../internal/evaluateSeed.ts';
import { IntegerSeed } from '../../internal/IntegerSeed.ts';
import { pickInteger } from '../pickInteger.ts';
import { Int32SeededRng, IntSeededRng, SeededRng } from '../seeded-rng.ts';

describe(SeededRng, () => {
  // Argument for clone is that it always leaves the seed of the parent unchanged.
  describe('static clone()', () => {
    const SEED_NUMBER = 1234;
    const SEED_NUMBER_RNG = 0.067_474_613_463_261_45;

    function getRngLike(): SeededGenerator & { peek(): number } {
      let base = SEED_NUMBER;
      return {
        next: (n = 1) => {
          const value = 2 * base;
          base += n;
          return value;
        },
        peek: () => {
          return 2 * base;
        },
        get seed() {
          return base;
        },
      };
    }

    for (const seedInput of [SEED_NUMBER, () => SEED_NUMBER]) {
      it(`given a seed of type ${typeof seedInput}, SeededRng.clone(seed) has the same result as new SeededRng(seed).clone()`, () => {
        const staticRng = SeededRng.clone(seedInput);
        const instanceRng = new SeededRng(seedInput).clone();

        expect(staticRng.peek()).toBe(SEED_NUMBER_RNG);
        expect(staticRng.next()).toBe(instanceRng.next());
        expect(staticRng.next()).toBe(instanceRng.next());
      });
    }

    // But if `seed` is self-incrementing, then
    // - the seed of `SeededRng.clone(seed)` is the same as its parent's seed, but
    // - the seed of `new SeededRng(seed).clone()` is advanced by one relative to its parent's.
    for (const [label, seedInputFn] of [
      ['SeededRng', () => new SeededRng(SEED_NUMBER)],
      ['SeededGenerator', getRngLike],
    ] as const) {
      it('produces consistent results', () => {
        expect(seedInputFn().seed).toBe(SEED_NUMBER);
        expect(seedInputFn().seed).toBe(seedInputFn().seed);
        expect(seedInputFn().next()).toBe(seedInputFn().next());
      });

      it(`given an RNG seed of type ${label}, SeededRng.clone(seed) behaves differently from new SeededRng.clone(input)`, () => {
        // Create identical inputs
        const seedInput1 = seedInputFn();
        const seedInput2 = seedInputFn();
        expect(seedInput1.seed).toBe(SEED_NUMBER);
        expect(seedInput2.seed).toBe(SEED_NUMBER);

        // Using the first input: `static clone` creates an RNG without advancing the input seed.
        // Result: The clone RNG's seed is the same as the input RNG's seed.
        const staticRng = SeededRng.clone(seedInput1);
        expect(seedInput1.seed).toBe(SEED_NUMBER);
        expect(staticRng.seed).toBe(SEED_NUMBER);

        // Using the second input: `constructor` + `clone`
        // - `constructor`: The input RNG is evaluated, yielding the 1st pseudorandom value.
        //   Result: The input RGN's seed is incremented, and the intermediate RGN's seed is the 1st pseudorandom value.
        // - `clone`: The intermediate RNG is cloned without yielding a value; is seed is inherited by the clone RNG.
        //   Result: The clone RNG's seed is the same as 1st pseudorandom value.
        const instanceRng = new SeededRng(seedInput2).clone(); // advances the input seed
        expect(seedInput2.seed).not.toBe(SEED_NUMBER); // the input seed is no longer the same as the input seed
        expect(instanceRng.seed).not.toBe(seedInput2.seed); // and the parent's seed has advanced
      });
    }

    it('given an RNG, returns a new RNG', () => {
      const seedRng = new SeededRng();

      const rng = SeededRng.clone(seedRng);

      expect(rng).toBeInstanceOf(SeededRng);
    });

    it('given a number, returns an RNG that uses that number as the seed', () => {
      const seed = 1;
      const expected = seed;

      const actual = SeededRng.clone(seed).seed;

      expect(actual).toBe(expected);
    });

    it('given undefined, returns undefined', () => {
      const input = undefined;
      const expected = undefined;

      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const actual = SeededRng.clone(input);

      expect(actual).toBe(expected);
    });

    it('given a function, invokes the function and returns an RNG that uses its result to create a seed', () => {
      const seed = 1234.5;
      const seedFn = vi.fn<() => number>(() => seed);
      // TODO: This is under-the-hood knowledge. Test in a way that doesn't rely on implementation details.
      const expected = IntegerSeed.toInt(seed);

      const actual = SeededRng.clone(seedFn).seed;

      expect(IntegerSeed.toInt(actual)).toBe(expected);
    });

    it("by default, the clone's seed is the same as the parent's", () => {
      const parentRng = new SeededRng();
      const cloneRng = SeededRng.clone(parentRng);

      expect(cloneRng.seed).toBe(parentRng.seed);
    });

    it("if invoked with nIncrements>0, advances the seed by n relative to the parent's", () => {
      const N_INCREMENTS = 3;
      const parentRng = new SeededRng();
      const childRng = SeededRng.clone(parentRng, N_INCREMENTS);
      parentRng.next(N_INCREMENTS);

      expect(childRng.seed).toBe(parentRng.seed);
    });
  });

  describe('static cloneOrCreate()', () => {
    it('if a seed is given, returns an RNG that uses the same seed', () => {
      const seed = 1234;
      const expectedSeed = seed;

      const actualSeed = SeededRng.cloneOrCreate(seed).seed;

      expect(actualSeed).toBe(expectedSeed);
    });

    it('if no seed is given, return a new RNG', () => {
      const seed = undefined;
      const rng = SeededRng.cloneOrCreate(seed);

      expect(rng).toBeInstanceOf(SeededRng);
    });
  });

  describe('static spawn()', () => {
    it('given a numeric seed, returns an RNG that uses the number as its seed', () => {
      const seed = 1234;

      const rng1 = SeededRng.spawn(seed);
      const rng2 = SeededRng.spawn(seed);

      expect(rng1).toBeDefined();
      expect(rng1.next()).toBe(rng2.next());
    });

    it('given undefined, returns undefined', () => {
      const seed = undefined;
      const expected = undefined;

      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      const actual = SeededRng.spawn(seed);

      expect(actual).toBe(expected);
    });

    it('given a function, invokes the function and returns an RNG that uses the result as the seed', () => {
      const seedFn = vi.fn<() => number>(() => 1);

      const rng1 = SeededRng.spawn(seedFn);
      const rng2 = SeededRng.spawn(seedFn);

      expect(rng1).toBeDefined();
      expect(rng1.next()).toBe(rng2.next());
    });

    it('given a SeededRng object, consumes a value in the instance', () => {
      const seedRng = new SeededRng();

      const rng1 = SeededRng.spawn(seedRng);
      const rng2 = SeededRng.spawn(seedRng);

      expect(rng1).toBeDefined();
      expect(rng1.next()).not.toBe(rng2.next());
    });
  });

  describe('constructor', () => {
    it('returns a SeededRng instance with a seed value', () => {
      const rng = new SeededRng();

      expect(rng).toBeInstanceOf(SeededRng);
      expect(rng.seed).toBeDefined();
    });

    it('returns an object containing a function whose output, when invoked successively, is a deterministic pseudo-random series of numbers', () => {
      const rng1 = new SeededRng(1);
      const rng2 = new SeededRng(1);

      const seedValues = [rng1.next(), rng1.next(), rng1.next()];

      const cloneValues = [rng2.next(), rng2.next(), rng2.next()];

      expect(seedValues).toStrictEqual(cloneValues);
      expect(seedValues[0]).not.toBe(seedValues[1]);
    });

    it('accepts as the seed a function that returns a number', () => {
      const seedFn = vi.fn<() => number>(() => 1234);
      const rng1 = new SeededRng(seedFn);
      const rng2 = new SeededRng(seedFn);

      expect(rng1.next()).toBe(rng2.next());
    });

    it('if the seed is a number generator, returns different results when used more than once', () => {
      const inputRng = new SeededRng();
      const seed1 = new SeededRng(inputRng);
      const seed2 = new SeededRng(inputRng);

      expect(seed1.next()).not.toBe(seed2.next());
    });
  });

  describe('get rng', () => {
    it('returns a function that successively returns values from the instance', () => {
      const rng1 = new SeededRng(1234);
      const rng2 = new SeededRng(1234);

      const generate1 = rng1.rng;
      const generate2 = rng2.rng;

      const result1 = generate1();
      const result2 = generate2();

      expect(result1).toBe(result2);
    });

    it('the function shares state with its instance', () => {
      const rng1 = new SeededRng(1234);
      const rng2 = new SeededRng(1234);

      // Gets a value from rng1, changing its next value relative to rng2.
      const generate1 = rng1.rng;
      generate1();

      // These would be equal if `generate1()` had not been called.
      const result1 = rng1.next();
      const result2 = rng2.next();

      expect(result1).not.toBe(result2);
    });
  });

  describe('clone()', () => {
    it('if invoked with nIncrements, advances n values from the current value', () => {
      const rng = new SeededRng();
      const clone = rng.clone(2);

      rng.next();
      rng.next();

      expect(clone.seed).toBe(rng.seed);
    });

    it('creates a child having the same seed as its parent', () => {
      const parentRng = new SeededRng();
      const childRng = parentRng.clone();

      expect(childRng.seed).toBe(parentRng.seed);
    });
  });

  describe('peek()', () => {
    it('returns the next value without incrementing the seed', () => {
      const rng = new SeededRng();
      const expected = rng.peek();

      const actual = rng.next();

      expect(actual).toBe(expected);
    });
  });

  describe('withSeed() - configured base function', () => {
    function pickLetter(options?: { seed?: Seed | undefined }): string {
      const letterIndex = pickInteger({ min: 0, max: 25, seed: options?.seed });

      return String.fromCodePoint(97 + letterIndex);
    }

    // Returns a random letter of the alphabet.
    it('returns a function that uses the SeededRng to produce deterministic pseudorandom outputs', () => {
      const getNextLetter = SeededRng.withSeed(pickLetter, 1234);

      const letter1 = getNextLetter();
      const actual = [letter1, getNextLetter(), getNextLetter()];

      expect(actual).not.toStrictEqual([letter1, letter1, letter1]);
    });

    it('returns a function that successively produces the same outputs when given the same seed', () => {
      const seed = 1234;
      const fn1 = SeededRng.withSeed(pickLetter, seed);
      const fn2 = SeededRng.withSeed(pickLetter, seed);

      const letters1 = [fn1(), fn1(), fn1()];
      const letters2 = [fn2(), fn2(), fn2()];

      expect(letters1).toStrictEqual(letters2);
    });
  });
});

for (const [preset, Rng, max] of [
  ['Int', IntSeededRng, 2 ** 31 - 1],
  ['Int32', Int32SeededRng, 2 ** 31 - 1],
] as const) {
  const className = `${preset}SeededRng`;

  describe(`${className} class`, () => {
    describe('static clone()', () => {
      it('returns a new instance of the same class', () => {
        const rng = new Rng(1234.5);

        const clone = Rng.clone(rng);

        expect(clone).toBeInstanceOf(Rng);
      });
    });

    describe('constructor', () => {
      it(`returns an instance of ${className}`, () => {
        const rng = new Rng();

        expect(rng).toBeInstanceOf(Rng);
      });

      it('generates an integer seed', () => {
        const rng = new Rng();
        expect(Number.isInteger(rng.seed)).toBe(true);
      });

      it('always generates integer values', () => {
        const seed = new Rng(1234.5);
        expect(Number.isInteger(seed.next())).toBe(true);
        expect(Number.isInteger(seed.next())).toBe(true);
      });

      it(`if the input seed exceeds max (${max}), uses modulo max`, () => {
        const expectedSeed = 1;

        const rng = new Rng(max + 1);

        expect(rng.seed).toBe(expectedSeed);
      });
    });

    describe('static spawn()', () => {
      it('returns a new instance of the same class', () => {
        const rng = new Rng();

        const spawned = Rng.spawn(rng);

        expect(spawned).toBeInstanceOf(Rng);
      });
    });

    describe('clone()', () => {
      it('returns a new instance of the same class with the same seed', () => {
        const parentRng = new Rng();

        const childRng = parentRng.clone();

        expect(childRng).toBeInstanceOf(Rng);
        expect(childRng.seed).toBe(parentRng.seed);
      });
    });

    describe('next()', () => {
      it('generates integer values', () => {
        const rng = new Rng(1234.5);
        const oldSeed = rng.seed;

        expect(Number.isInteger(rng.next())).toBe(true);
        expect(rng.seed).not.toBe(oldSeed);
      });
    });
  });
}
