import { describe, expect, it } from 'vitest';

import { splitDelimited } from '../splitDelimited.ts';

describe(splitDelimited, () => {
  const params = { opening: '{', closing: '}', separator: '|' };

  it('removes the delimiters and splits on the separator', () => {
    const input = '{firstName|lastName}';
    const expected = ['firstName', 'lastName'];

    const actual = splitDelimited(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('ignores separators in delimited substrings', () => {
    const input = '{1{A|B}|2|3{C|D}}';
    const expected = ['1{A|B}', '2', '3{C|D}'];

    const actual = splitDelimited(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('keeps a nested delimited substring that follows a separator', () => {
    const input = '{A|{B|C}}';
    const expected = ['A', '{B|C}'];

    const actual = splitDelimited(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('keeps an empty fragment between adjacent separators', () => {
    const input = '{A||B}';
    const expected = ['A', '', 'B'];

    const actual = splitDelimited(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('keeps an empty fragment after a trailing separator', () => {
    const input = '{A|}';
    const expected = ['A', ''];

    const actual = splitDelimited(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('given empty delimiters, returns one empty fragment', () => {
    const input = '{}';
    const expected = [''];

    const actual = splitDelimited(input, params);

    expect(actual).toStrictEqual(expected);
  });

  it('splits on a multi-character separator without skipping the next character', () => {
    const input = '{A||{B||C}||D}';
    const expected = ['A', '{B||C}', 'D'];

    const actual = splitDelimited(input, { ...params, separator: '||' });

    expect(actual).toStrictEqual(expected);
  });

  it('given an undelimited string, throws an error', () => {
    const input = 'Hello, world!';

    expect(() => splitDelimited(input, params)).toThrow('Expected a string delimited by "{" and "}".');
  });
});
