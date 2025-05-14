import { assertEquals, describe, it } from '../../dev_deps.ts';

import { toLowerCase, toUpperCase, trim, trimEnd, trimStart } from '../String-prototype-wrappers.ts';

describe('toLowerCase()', () => {
  it('converts all characters to lowercase', () => {
    const input = 'STRING';
    const expected = 'string';

    const actual = toLowerCase(input);

    assertEquals(actual, expected);
  });
});

describe('toUpperCase()', () => {
  it('converts all characters to uppercase', () => {
    const input = 'string';
    const expected = 'STRING';

    const actual = toUpperCase(input);

    assertEquals(actual, expected);
  });
});

describe('trim()', () => {
  it('removes all leading & trailing whitespace without changing internal whitespace', () => {
    const input = ' \t string with\t   leading & trailing whitespace  ';
    const expected = 'string with\t   leading & trailing whitespace';

    const actual = trim(input);

    assertEquals(actual, expected);
  });
});

describe('trimEnd()', () => {
  it('removes all trailing whitespace', () => {
    const input = ' \t string\t  ';
    const expected = ' \t string';

    const actual = trimEnd(input);

    assertEquals(actual, expected);
  });
});

describe('trimStart()', () => {
  it('removes all leading whitespace', () => {
    const input = '   \tstring \t ';
    const expected = 'string \t ';

    const actual = trimStart(input);

    assertEquals(actual, expected);
  });
});
