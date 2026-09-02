import { describe, expect, it } from 'vitest';

import { isArraySubscript } from '../site-handoffs.ts';

describe(isArraySubscript, () => {
  it('claims a bracket following an identifier', () => {
    expect(isArraySubscript('const item = items[')).toBe(true);
  });

  it('claims a bracket following a call, a subscript, or a string', () => {
    const subscripts = ['const x = read()[', 'const x = grid[row][', "const x = lookup['key']["];

    expect(subscripts.filter((before) => !isArraySubscript(before))).toStrictEqual([]);
  });

  it('claims a bracket reached through optional chaining', () => {
    expect(isArraySubscript('const item = items?.[')).toBe(true);
  });

  // A formatter that wraps the subscript's contents leaves a space kept by the condensing.
  it('claims a bracket after which the condensing left a space', () => {
    const spaced = ['const item = items[ ', 'const item = items?.[ '];

    expect(spaced.filter((before) => !isArraySubscript(before))).toStrictEqual([]);
  });

  it('declines a bracket opening an array literal', () => {
    const literals = ['const values = [', 'call(', 'const pair = [a, [', 'const make = () => ['];

    expect(literals.filter((before) => isArraySubscript(before))).toStrictEqual([]);
  });

  it('declines a bracket following a keyword that takes an expression', () => {
    const keywords = ['return [', 'return [ ', 'case [', 'for (const value of [', 'yield ['];

    expect(keywords.filter((before) => isArraySubscript(before))).toStrictEqual([]);
  });

  // `return[0]` parses as a returned array literal, so the keyword set carries the verdict where spacing cannot.
  it('declines an unspaced keyword bracket, which no spacing distinguishes from a subscript', () => {
    expect(isArraySubscript('return[')).toBe(false);
  });

  it('declines text ending anywhere but an opening bracket', () => {
    expect(isArraySubscript('const total = items.length * ')).toBe(false);
  });
});
