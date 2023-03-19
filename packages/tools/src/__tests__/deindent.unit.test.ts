import { describe, expect, it } from 'vitest';

import { END_OF_LINE } from '../core.constants.js';
import { deindent } from '../deindent.js';

describe('deindent``', () => {
  it('if the first and last line are empty, discards them', () => {
    const deindented = deindent`
first line
second line
  `;
    const expected = [
      'first line',
      'second line',
    ].join(END_OF_LINE);

    expect(deindented).toBe(expected);
  });

  it('if the last line is not empty, deindents that line along with the others', () => {
    const deindented = deindent`
      first line
      last line`;
    const expected = [
      'first line',
      'last line',
    ].join(END_OF_LINE);

    expect(deindented).toBe(expected);
  });

  it('if the smallest indent is 6 spaces, removes 6 spaces from every line', () => {
    const deindented = deindent`
      indent 6
        indent 8
      indent 6
    `;
    const expected = [
      'indent 6',
      '  indent 8',
      'indent 6',
    ].join(END_OF_LINE);

    expect(deindented).toBe(expected);
  });

  it('if the first line is not empty, throws an error', () => {
    expect(
      () => deindent`not empty`
    ).toThrow(/first line/);
  });
});
