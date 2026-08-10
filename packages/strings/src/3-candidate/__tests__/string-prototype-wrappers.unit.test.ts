import { describe, expect, it } from 'vitest';

import { toLowerCase, toUpperCase, trim, trimEnd, trimStart } from '../string-prototype-wrappers.ts';

describe(toLowerCase, () => {
  it('converts all characters to lowercase', () => {
    const input = 'STRING';
    const expected = 'string';

    const actual = toLowerCase(input);

    expect(actual).toBe(expected);
  });
});

describe(toUpperCase, () => {
  it('converts all characters to uppercase', () => {
    const input = 'string';
    const expected = 'STRING';

    const actual = toUpperCase(input);

    expect(actual).toBe(expected);
  });
});

describe(trim, () => {
  it('removes all leading & trailing whitespace without changing internal whitespace', () => {
    const input = ' \t string with\t   leading & trailing whitespace  ';
    const expected = 'string with\t   leading & trailing whitespace';

    const actual = trim(input);

    expect(actual).toBe(expected);
  });
});

describe(trimEnd, () => {
  it('removes all trailing whitespace', () => {
    const input = ' \t string\t  ';
    const expected = ' \t string';

    const actual = trimEnd(input);

    expect(actual).toBe(expected);
  });
});

describe(trimStart, () => {
  it('removes all leading whitespace', () => {
    const input = '   \tstring \t ';
    const expected = 'string \t ';

    const actual = trimStart(input);

    expect(actual).toBe(expected);
  });
});
