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

  it('given an undelimited string, throws an error', () => {
    const input = 'Hello, world!';

    expect(() => splitDelimited(input, params)).toThrowError('Expected a string delimited by "{" and "}".');
  });
});
