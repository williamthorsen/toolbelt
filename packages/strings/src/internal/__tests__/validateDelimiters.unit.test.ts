import { describe, expect, it, vi } from 'vitest';

import type { ValidationResult } from '../../types/common.types.ts';
import { validateDelimiters } from '../validateDelimiters.ts';

describe(validateDelimiters, () => {
  const params = { opening: '{', closing: '}' };
  const successResult = { isValid: true, errors: [] };

  it('given a string without delimiters, returns success', () => {
    const input = 'Hello, world!';
    const expected = successResult;

    const actual = validateDelimiters(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('given a string with matching delimiters, returns success', () => {
    const input = 'Hello, {world}!';
    const expected = successResult;

    const actual = validateDelimiters(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('given a string with unmatched opening delimiter, returns failure', () => {
    const input = 'Hello, {world!';
    const expected = {
      isValid: false,
      errors: [
        {
          code: 'UNMATCHED_OPENING_DELIMITER',
          message: 'Text has unmatched opening delimiter "{".',
        },
      ],
    };

    const actual = validateDelimiters(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('given a string with unmatched closing delimiter, returns failure', () => {
    const input = 'Hello, world}!';
    const expected = {
      isValid: false,
      errors: [
        {
          code: 'UNMATCHED_CLOSING_DELIMITER',
          message: 'Text has unmatched closing delimiter "}".',
        },
      ],
    };

    const actual = validateDelimiters(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('given a string with incorrectly nested delimiters, returns failure', () => {
    const input = 'Hello, {wo}r}ld!';
    const expected = {
      isValid: false,
      errors: [
        {
          code: 'UNMATCHED_CLOSING_DELIMITER',
          message: 'Text has unmatched closing delimiter "}".',
        },
      ],
    };

    const actual = validateDelimiters(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('if opening & closing delimiters are the same character, throws an error', () => {
    const input = '';
    const badParams = { opening: '{', closing: '{' };
    const expectedErrorMessage = 'Opening and closing delimiters must be different.';

    const throwingFn = vi.fn<() => ValidationResult>(() => validateDelimiters(input, badParams));

    expect(throwingFn).toThrowError(new Error(expectedErrorMessage));
  });

  it('if throwOnError=true, throws an error containing the first error message', () => {
    const input = 'Hello, [wo]r]ld!';
    const withErrorParams = { opening: '[', closing: ']', throwOnError: true };
    const expectedErrorMessage = 'Text has unmatched closing delimiter "]".';

    const throwingFn = vi.fn<() => ValidationResult>(() => validateDelimiters(input, withErrorParams));

    expect(throwingFn).toThrowError(new Error(expectedErrorMessage));
  });

  describe('disallowNested option with correct nesting', () => {
    const input = 'Hello, {w{o}r}ld!';

    it('unless disallowNested=true, returns success', () => {
      const expected = successResult;

      const actual = validateDelimiters(input, params);

      expect(actual).toStrictEqual(expected);
    });

    it('if disallowNested=true, returns failure', () => {
      const withDisallowNestedParams = { ...params, disallowNested: true };
      const expected = {
        isValid: false,
        errors: [
          {
            code: 'NESTED_DELIMITERS',
            message: 'Text has nested delimiters.',
          },
        ],
      };

      const actual = validateDelimiters(input, withDisallowNestedParams);

      expect(actual).toStrictEqual(expected);
    });
  });
});
