import { describe, expect, it } from 'vitest';

import { findLiteralEnd } from '../findLiteralEnd.ts';

describe(findLiteralEnd, () => {
  it.each([
    { label: 'an object', literal: '{ a: { b: 1 } }' },
    { label: 'an array', literal: '[1, [2]]' },
    { label: 'a blanked string', literal: "'   '" },
    { label: 'a blanked template literal', literal: '`   `' },
    { label: 'a number', literal: '-1.5e+3' },
    { label: 'a keyword', literal: 'null' },
  ])('returns the offset past $label', ({ literal }) => {
    expect(findLiteralEnd(`${literal} as const`)).toBe(literal.length);
  });

  it('rejects an identifier that a keyword prefixes', () => {
    expect(findLiteralEnd('nullish')).toBeUndefined();
  });

  it('returns nothing for a group that never balances', () => {
    expect(findLiteralEnd('{ a: 1')).toBeUndefined();
  });

  it('returns nothing for a string that never closes', () => {
    expect(findLiteralEnd("'   ")).toBeUndefined();
  });

  it('returns nothing when the text opens with no literal', () => {
    expect(findLiteralEnd('value')).toBeUndefined();
  });
});
