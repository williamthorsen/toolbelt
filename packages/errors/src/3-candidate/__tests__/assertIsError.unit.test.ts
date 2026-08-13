import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import { assertIsError } from '../assertIsError.ts';

describe(assertIsError, () => {
  it('does nothing when the value is an Error', () => {
    expect(() => {
      assertIsError(new Error('connection refused'));
    }).not.toThrow();
  });

  it('does nothing when the value is an Error from another realm', () => {
    const foreignError: unknown = vm.runInNewContext('new Error("connection refused")');

    expect(() => {
      assertIsError(foreignError);
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
