import { describe, expect, it } from 'vitest';

import { isPatternMatch } from '../isPatternMatch.ts';

describe(isPatternMatch, () => {
  it('returns true for an exact match with a string pattern', () => {
    const pattern = 'hello world';
    const str = 'hello world';

    const result = isPatternMatch(pattern, str);

    expect(result).toBe(true);
  });

  it('if match to string patterns is only partial, returns false', () => {
    const pattern = 'hello';
    const str = 'hello world';

    const result = isPatternMatch(pattern, str);

    expect(result).toBe(false);
  });

  it('accepts RegExp patterns', () => {
    const input = 'hello world';
    const matchingPattern = /world$/;
    const nonmatchingPattern = /^world/;

    expect(isPatternMatch(matchingPattern, input)).toBe(true);
    expect(isPatternMatch(nonmatchingPattern, input)).toBe(false);
  });

  it('accepts a function that takes a string and returns a boolean', () => {
    const input = 'hello world';
    const matchingPattern = (s: string) => s.endsWith('world');
    const nonmatchingPattern = (s: string) => s.startsWith('world');

    expect(isPatternMatch(matchingPattern, input)).toBe(true);
    expect(isPatternMatch(nonmatchingPattern, input)).toBe(false);
  });

  it('returns true if any of the array patterns match', () => {
    const patterns = ['goodbye', 'world', /hello/];
    const str = 'hello world';

    const result = isPatternMatch(patterns, str);

    expect(result).toBe(true);
  });

  it('returns false if none of the array patterns match', () => {
    const patterns = ['goodbye', 'planet', /^world/];
    const str = 'hello world';

    const result = isPatternMatch(patterns, str);

    expect(result).toBe(false);
  });

  it('handles mixed arrays of string and RegExp patterns', () => {
    const patterns = ['goodbye', /^hello/, 'planet'];
    const str = 'hello world';

    const result = isPatternMatch(patterns, str);

    expect(result).toBe(true);
  });

  it('returns false for empty string even if pattern exists', () => {
    const pattern = 'hello';
    const str = '';

    const result = isPatternMatch(pattern, str);

    expect(result).toBe(false);
  });
});
