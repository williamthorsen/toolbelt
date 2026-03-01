import { expectTypeOf } from 'expect-type';
import { describe, expect, it } from 'vitest';

import { assert } from '../assert.ts';

const DEFAULT_MESSAGE = 'Assertion failed';

describe(assert, () => {
  it('does not throw if the condition is true', () => {
    expect(() => {
      assert(true);
    }).not.toThrowError();
  });

  it('throws if the condition is false', () => {
    expect(() => {
      assert(false);
    }).toThrowError(new Error(DEFAULT_MESSAGE));
  });

  it('throws with a custom message if given', () => {
    const customMessage = 'Custom error message';

    expect(() => {
      assert(false, customMessage);
    }).toThrowError(new Error(customMessage));
  });

  it('throws with a custom Error if given', () => {
    const customError = new TypeError('Custom type error');

    expect(() => {
      assert(false, customError);
    }).toThrowError(customError);
  });

  it('narrows the type if the condition is a type guard', () => {
    function checkType(value: unknown) {
      assert(typeof value === 'string', 'Condition is true');
      expectTypeOf<string>(value);
    }

    expect(() => checkType('test')).not.toThrowError();
  });
});
