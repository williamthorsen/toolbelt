import { computeFakeMathRandom } from '../internal/computeFakeMathRandom.ts';
import { checkIsRngLike, evaluateSeed, type Seed, type SeededGenerator } from '../internal/evaluateSeed.ts';
import { IntegerSeed } from '../internal/IntegerSeed.ts';
import { wrapSum } from '../internal/wrapSum.ts';
import { pickInteger } from './pickInteger.ts';
import { scaleInt } from './scale.ts';

/**
 * A pseudo-random number generator that behaves deterministically when given a seed.
 */
export class SeededRng implements SeededGenerator {
  private _seed = 0; // internally incremented value to provide deterministic behaviour
  private baseSeed = 0; // original value used to create the seed
  private nIncrements = 0;

  /** Creates a generator from the seed, or from a random seed when none is given. */
  constructor(seed?: Seed) {
    this.initializeSeeds(SeededRng.evaluateSeed(seed));
  }

  /** Returns the upper bound of the seed range, as an accessor because a static property cannot be overridden. */
  get maxBase(): number {
    return IntegerSeed.max;
  }

  /** Returns a function that yields the next value on each call, sharing this instance's state. */
  get rng(): () => number {
    return () => this.next();
  }

  /** Returns the current seed. */
  get seed(): number {
    return this._seed;
  }

  /** Resolves a seed-like value to a number. */
  static evaluateSeed(seed?: Seed): number | undefined {
    return evaluateSeed(seed);
  }

  /**
   * Creates a child from a seed without mutating the parent seed.
   */
  static clone<T extends ThisConstructor<typeof SeededRng>>(this: T, seed: undefined, nIncrements?: number): undefined;
  static clone<T extends ThisConstructor<typeof SeededRng>>(this: T, seed: Seed, nIncrements?: number): This<T>;
  static clone<T extends ThisConstructor<typeof SeededRng>>(
    this: T,
    seed: Seed | undefined,
    nIncrements?: number,
  ): This<T> | undefined;
  static clone<T extends ThisConstructor<typeof SeededRng>>(
    this: T,
    seed?: Seed,
    nIncrements = 0,
  ): This<T> | undefined {
    if (checkIsRngLike(seed)) {
      return new this(seed.seed).increment(nIncrements);
    }
    return seed === undefined ? undefined : new this(seed).increment(nIncrements);
  }

  /**
   * Clones the given seed, or creates a randomly seeded generator when none is given.
   */
  static cloneOrCreate<T extends ThisConstructor<typeof SeededRng>>(
    this: T,
    seed?: Seed,
    nIncrements?: number,
  ): This<T> {
    return seed === undefined ? new this() : this.clone(seed, nIncrements);
  }

  /** Creates a child from a seed, advancing the seed when it is a generator. */
  static spawn<T extends ThisConstructor<typeof SeededRng>>(this: T, seed: undefined): undefined;
  static spawn<T extends ThisConstructor<typeof SeededRng>>(this: T, seed: Seed): This<T>;
  static spawn<T extends ThisConstructor<typeof SeededRng>>(this: T, seed: Seed | undefined): This<T> | undefined;
  static spawn<T extends ThisConstructor<typeof SeededRng>>(this: T, seed?: Seed): This<T> | undefined {
    return seed === undefined ? undefined : new this(seed);
  }

  /**
   * Wraps a seed-accepting function so that every call passes it one generator spawned from the seed.
   * The spawned generator is an instance of the class on which the method is called, so subclasses supply their
   * own sequence.
   */
  static withSeed<TOptions extends object, R>(
    fn: (options?: OptionsWithSeed<TOptions> | OptionsWithSeed<EmptyObject>) => R,
    seed: Seed | undefined,
  ) {
    const spawnedRng = this.spawn(seed);
    return function (options?: TOptions): R {
      return fn({ ...options, seed: spawnedRng });
    };
  }

  /** Returns a copy of this generator, advanced by the given number of increments. */
  clone<T extends SeededRng>(this: T, nIncrements = 0): T {
    // `this.constructor` is typed as `Function`, so constructing the subclass requires an assertion.
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return new (this.constructor as Constructor<T>)(this._seed).increment(nIncrements);
  }

  /** Safely increments the seed by the given number of increments */
  increment(nIncrements = 1): this {
    const n = Math.floor(nIncrements);
    for (let i = 0; i < n; i++) {
      // TODO: Consider whether scaling is justified by the use case of a smaller seed range
      const scaledSeed = this.scaleUpSeed(this._seed);
      this._seed = this.scaleDownSeed(IntegerSeed.next(scaledSeed));
    }
    this.nIncrements += n;
    return this;
  }

  /** Returns the next value in the pseudo-random sequence, then advances the seed `n` times. */
  next(n = 1): number {
    const value = this.generateValue();
    for (let i = 0; i < n; i++) this.increment();
    return value;
  }

  /**
   * Returns the next value in the pseudo-random sequence without incrementing the seed.
   * For use in testing and debugging.
   */
  peek(): number {
    return this.generateValue();
  }

  /** Maps a seed from the full integer-seed range onto this generator's range. */
  scaleDownSeed(seed: number): number {
    return scaleInt(seed, { min: 1, max: this.maxBase }, { min: 1, max: IntegerSeed.max });
  }

  /** Maps a seed from this generator's range onto the full integer-seed range. */
  scaleUpSeed(value: number): number {
    return scaleInt(value, { min: 1, max: IntegerSeed.max }, { min: 1, max: this.maxBase });
  }

  /** Returns the value derived from the current seed. */
  protected generateValue(): number {
    return computeFakeMathRandom(this._seed);
  }

  /** Records the base seed, wrapped into range, and starts the current seed at it. */
  protected initializeSeeds(baseSeed?: number): void {
    this.baseSeed = wrapSum(this.maxBase, IntegerSeed.toInt(baseSeed));
    this._seed = this.baseSeed;
  }
}

/** A `SeededRng` that returns integers in the range [1, Number.MAX_SAFE_INTEGER]. */
export class IntSeededRng extends SeededRng {
  /** Returns an integer derived from the current seed. */
  protected override generateValue(): number {
    return pickInteger({ min: 1, max: Number.MAX_SAFE_INTEGER, seed: computeFakeMathRandom(this.seed) });
  }
}

/** A `SeededRng` that returns integers in the range [1, 2 ** 32 - 1]. */
export class Int32SeededRng extends SeededRng {
  /** Returns an integer derived from the current seed. */
  protected override generateValue(): number {
    return pickInteger({ min: 1, max: 2 ** 32 - 1, seed: computeFakeMathRandom(this.seed) });
  }
}
// region | Types
type Constructor<T, Arguments extends unknown[] = unknown[]> = new (...arguments_: Arguments) => T;

type EmptyObject = Record<string, never> | Record<number, never>;

type OptionsWithSeed<O> = O & { seed?: Seed | undefined };

type ThisConstructor<T extends { prototype: unknown } = { prototype: unknown }> = T;

type This<T extends ThisConstructor> = T['prototype'];
// endregion | Types
