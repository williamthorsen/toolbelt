import { describe, expect, it } from 'vitest';

import { assertIsError } from '../assertIsError.ts';

describe('assertIsError()', () => {
  it('does not throw an error when the input is an instance of Error', () => {
    const error = new Error('this is a valid error');
    expect(() => {
      assertIsError(error);
    }).not.toThrow();
  });

  it('re-throws the error when the input is not an instance of Error', () => {
    const errMessage = 'This is not an Error object';
    expect(() => {
      assertIsError(errMessage);
    }).toThrow(errMessage);
  });
});
