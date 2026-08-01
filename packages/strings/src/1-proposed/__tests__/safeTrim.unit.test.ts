import { expectTypeOf } from 'expect-type';
import { describe, expect, it } from 'vitest';

import { safeTrim } from '../safeTrim.ts';

describe(safeTrim, () => {
  it('returns the original string if it is already trimmed', () => {
    const input = 'test string';
    const expected = input;

    const actual = safeTrim(input);

    expect(actual).toBe(expected);
  });

  it('trims leading and trailing whitespace', () => {
    const input = '   test string   ';
    const expected = 'test string';

    const actual = safeTrim(input);

    expect(actual).toBe(expected);
  });

  it('returns an empty string if the input is only whitespace', () => {
    const input = ' '.repeat(3);
    const expected = '';

    const actual = safeTrim(input);

    expect(actual).toBe(expected);
  });

  it('returns the input if the input is a number', () => {
    const input = 123;
    const expected = input;

    const actual = safeTrim(input);

    expect(actual).toBe(expected);
    expectTypeOf<number>(actual);
  });

  it('returns the input if the input is null', () => {
    const input = null;
    const expected = input;

    const actual = safeTrim(input);

    expect(actual).toBe(expected);
    expectTypeOf<null>(actual);
  });

  it('returns the input if the input is undefined', () => {
    const input = undefined;
    const expected = input;

    const actual = safeTrim(input);

    expect(actual).toBe(expected);
    expectTypeOf<undefined>(actual);
  });

  it.each([
    { label: 'array', value: [] },
    { label: 'number', value: 123 },
    { label: 'object', value: {} },
    { label: 'null', value: null },
    { label: 'undefined', value: undefined },
  ])('returns the input if the input is $label', ({ value }) => {
    expect(safeTrim(value)).toBe(value);
  });
});
