import { describe, expect, it } from 'vitest';

import { condenseWhitespace, removeWhitespace, trimWhitespace } from '../whitespace-functions.ts';

describe(condenseWhitespace, () => {
  it('replaces any sequence of tabs & spaces with a single space', () => {
    const dirtyString = 'string\t\t  with tabs\t \t and spaces';
    const expected = 'string with tabs and spaces';

    const actual = condenseWhitespace(dirtyString);

    expect(actual).toBe(expected);
  });

  it('preserves up to one each of leading & trailing spaces', () => {
    const dirtyString = '\t string with leading & trailing whitespace\t ';
    const expected = ' string with leading & trailing whitespace ';

    const actual = condenseWhitespace(dirtyString);

    expect(actual).toBe(expected);
  });

  it('works across newlines, preserving up to one space on a blank line', () => {
    const input = 'string with \n\n \t \n newlines';
    const expected = 'string with \n\n \n newlines';

    const actual = condenseWhitespace(input);

    expect(actual).toBe(expected);
  });
});

describe(removeWhitespace, () => {
  it('removes all whitespace', () => {
    const input = ' \t string with \twhitespace  ';
    const expected = 'stringwithwhitespace';

    const actual = removeWhitespace(input);

    expect(actual).toBe(expected);
  });
});

describe(trimWhitespace, () => {
  it('removes extra internal whitespace and all leading & trailing whitespace', () => {
    const input = ' \t string with   leading & trailing whitespace  ';
    const expected = 'string with leading & trailing whitespace';

    const actual = trimWhitespace(input);

    expect(actual).toBe(expected);
  });

  it('works across newlines', () => {
    const input = ' \t string with \n  \n \t \n newlines  ';
    const expected = 'string with\n\n\nnewlines';

    const actual = trimWhitespace(input);

    expect(actual).toBe(expected);
  });
});
