import { assertEquals, describe, it } from '../../dev_deps.ts';
import { isNotPromise, isPromise } from '../isPromise.ts';

describe('isPromise()', () => {
  it('identifies native promises as promises', () => {
    const promise = new Promise<void>((resolve) => resolve());

    assertEquals(isPromise(promise), true);
    assertEquals(isNotPromise(promise), false);
  });

  it('identifies thenables as promises', () => {
    const thenable = {
      then: (onfulfilled: (s: string) => void) => onfulfilled('resolved'),
    };

    assertEquals(isPromise(thenable), true);
  });

  it('does not identify non-thenables as promises', () => {
    const notThenable = {
      notThen: () => 'not a promise',
    };

    assertEquals(isPromise(notThenable), false);
  });

  it('does not identify null values as promises', () => {
    assertEquals(isPromise(null), false);
  });

  it('does not identify undefined values as promises', () => {
    assertEquals(isPromise(undefined), false);
  });

  it('does not identify primitive values as promises', () => {
    assertEquals(isPromise(123), false);
    assertEquals(isPromise('string'), false);
    assertEquals(isPromise(true), false);
  });

  it('does not identify objects without then methods as promises', () => {
    assertEquals(isPromise({}), false);
  });
});
