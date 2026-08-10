import { describe, expect, it } from 'vitest';

import { END_OF_LINE, unindent } from '../unindent.ts';

describe(unindent, () => {
  it('if the first and last line are empty, discards them', () => {
    const expected = [
      'first line', //
      'second line',
    ].join(END_OF_LINE);

    const unindented = unindent`
      first line
      second line
    `;

    expect(unindented).toBe(expected);
  });

  it('if a line other than the first or last is empty, ignores it for purposes of computing the final indent', () => {
    const expected = [
      '', //
      'previous line is empty but ignored',
    ].join(END_OF_LINE);

    const unindented = unindent`

      previous line is empty but ignored
    `;

    expect(unindented).toBe(expected);
  });

  it('if all lines are empty, returns only the line breaks between them', () => {
    const unindented = unindent`


    `;
    // Expect one END_OF_LINE because there are two empty lines with a line break between them.
    expect(unindented).toBe(END_OF_LINE);
  });

  it('if the last line is not empty, unindents that line along with the others', () => {
    const unindented = unindent`
      first line
      last line`;
    const expected = [
      'first line', //
      'last line',
    ].join(END_OF_LINE);

    expect(unindented).toBe(expected);
  });

  it('if the smallest indent is 6 spaces, removes 6 spaces from every line', () => {
    const unindented = unindent`
      indent 6
        indent 8
      indent 6
    `;
    const expected = [
      'indent 6', //
      '  indent 8',
      'indent 6',
    ].join(END_OF_LINE);

    expect(unindented).toBe(expected);
  });

  it('if the first line is not empty, throws an error', () => {
    expect(() => unindent`not empty`).toThrow(/first line/);
  });

  it('if the string contains embedded expressions, replaces the expressions with the results of their evaluation', () => {
    const delimiter = '|';
    const value = 'new value';
    const expected = '|new value|';

    const unindented = unindent`
      ${delimiter}${value}${delimiter}
    `;

    expect(unindented).toBe(expected);
  });
});
