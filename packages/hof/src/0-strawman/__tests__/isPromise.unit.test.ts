import { describe, expect, it } from 'vitest';

import { isNotPromise, isPromise } from '../isPromise.ts';

describe(isPromise, () => {
  it('identifies native promises as promises', () => {
    const promise = new Promise<void>((resolve) => resolve());

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
});
