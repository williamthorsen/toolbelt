import { describe, expect, it } from 'vitest';

import { assertIsError, isError } from '../is-error.ts';

describe(assertIsError, () => {
  it('does nothing when the value is an Error', () => {
    expect(() => {
      assertIsError(new Error('connection refused'));
    }).not.toThrow();
  });

  it('rethrows a value that is not an Error, unchanged', () => {
    const thrown = { code: 'ENOENT' };
    let caught: unknown;

    try {
      assertIsError(thrown);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBe(thrown);
  });

  it('narrows the value to Error', () => {
    const error: unknown = new Error('connection refused');

    assertIsError(error);

    expect(error.message).toBe('connection refused');
  });
});

describe(isError, () => {
  it('returns true for an Error and for a subclass of one', () => {
    expect([isError(new Error('connection refused')), isError(new TypeError('bad type'))]).toStrictEqual([true, true]);
  });

  it('returns false for a value that is not an Error', () => {
    expect([
      isError('connection refused'),
      isError({ message: 'connection refused' }),
      isError(undefined),
      isError(null),
    ]).toStrictEqual([false, false, false, false]);
  });
});
