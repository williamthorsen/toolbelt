import { describe, expect, expectTypeOf, it } from 'vitest';

import { isNotPromise, isPromise } from '../isPromise.ts';

describe(isPromise, () => {
  it('identifies native promises as promises', () => {
    const promise = Promise.resolve();

    expect(isPromise(promise)).toBe(true);
    expect(isNotPromise(promise)).toBe(false);
  });

  it('identifies thenables as promises', () => {
    const thenable = {
      then: (onfulfilled: (s: string) => void) => onfulfilled('resolved'),
    };

    expect(isPromise(thenable)).toBe(true);
  });

  it('does not identify non-thenables as promises', () => {
    const notThenable = {
      notThen: () => 'not a promise',
    };

    expect(isPromise(notThenable)).toBe(false);
  });

  it('does not identify null values as promises', () => {
    expect(isPromise(null)).toBe(false);
  });

  it('does not identify undefined values as promises', () => {
    expect(isPromise(undefined)).toBe(false);
  });

  it('does not identify primitive values as promises', () => {
    expect(isPromise(123)).toBe(false);
    expect(isPromise('string')).toBe(false);
    expect(isPromise(true)).toBe(false);
  });

  it('does not identify objects without then methods as promises', () => {
    expect(isPromise({})).toBe(false);
  });

  it('narrows to PromiseLike<unknown> without a type parameter', () => {
    expectTypeOf(isPromise).guards.toEqualTypeOf<PromiseLike<unknown>>();
  });

  it('narrows a union to its thenable members and the false branch to the rest', () => {
    expectTypeOf(keepThenable(pickValue())).toEqualTypeOf<Promise<number> | PromiseLike<string> | undefined>();
    expectTypeOf(dropThenable(pickValue())).toEqualTypeOf<number | undefined>();
  });
});

describe(isNotPromise, () => {
  it('returns false for a thenable that is not a Promise', () => {
    const thenable = {
      then: (onfulfilled: (s: string) => void) => {
        onfulfilled('resolved');
      },
    };

    expect(isNotPromise(thenable)).toBe(false);
  });

  it('narrows by excluding every thenable', () => {
    expectTypeOf(keepNonThenable(pickValue())).toEqualTypeOf<number | undefined>();
  });
});

// region | Helpers
/** Returns `value` when `isPromise` rejects it, so that its static type shows the false branch. */
function dropThenable(value: MixedValue) {
  return isPromise(value) ? undefined : value;
}

/** Returns `value` when `isNotPromise` accepts it, so that its static type shows the narrowing. */
function keepNonThenable(value: MixedValue) {
  return isNotPromise(value) ? value : undefined;
}

/** Returns `value` when `isPromise` accepts it, so that its static type shows the true branch. */
function keepThenable(value: MixedValue) {
  return isPromise(value) ? value : undefined;
}

/** Returns a value whose static type mixes a number, a Promise, and a non-Promise thenable. */
function pickValue(): MixedValue {
  return 1;
}
// endregion | Helpers

type MixedValue = number | Promise<number> | PromiseLike<string>;
