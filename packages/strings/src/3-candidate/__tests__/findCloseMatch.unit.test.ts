import { describe, expect, it } from 'vitest';

import { findCloseMatch } from '../findCloseMatch.ts';

const candidates = ['build', 'check', 'list', 'sync', 'test'];

describe(findCloseMatch, () => {
  it.each([
    ['an adjacent transposition', 'chekc', 'check'],
    ['a substitution', 'tast', 'test'],
    ['an insertion', 'syncc', 'sync'],
    ['a deletion', 'syn', 'sync'],
    ['two edits', 'chk', 'check'],
    ['an exact match', 'list', 'list'],
  ])('returns the candidate for %s', (_case, input, expected) => {
    expect(findCloseMatch(input, candidates)).toBe(expected);
  });

  it('returns undefined for an input farther than two edits away', () => {
    expect(findCloseMatch('deploy', candidates)).toBeUndefined();
  });

  it('returns undefined when the distance is not less than the input length', () => {
    expect(findCloseMatch('ls', ['ls-files', 'cd'])).toBeUndefined();
    expect(findCloseMatch('x', ['a'])).toBeUndefined();
  });

  it('breaks a tie in favour of the earliest candidate', () => {
    expect(findCloseMatch('bat', ['cat', 'bar'])).toBe('cat');
    expect(findCloseMatch('bat', ['bar', 'cat'])).toBe('bar');
  });

  it('returns undefined when there are no candidates', () => {
    expect(findCloseMatch('list', [])).toBeUndefined();
  });

  it('compares by code point', () => {
    // Each emoji is two UTF-16 code units, so a code-unit comparison would accept this 1-edit match.
    expect(findCloseMatch('😀', ['😁'])).toBeUndefined();
    expect(findCloseMatch('😀a', ['😁a'])).toBe('😁a');
  });

  it('compares case-sensitively', () => {
    expect(findCloseMatch('LIST', candidates)).toBeUndefined();
  });
});
