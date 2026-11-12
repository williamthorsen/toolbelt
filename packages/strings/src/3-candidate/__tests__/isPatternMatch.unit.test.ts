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

  it('given a RegExp pattern, returns whether it matches the string', () => {
    const input = 'hello world';
    const matchingPattern = /world$/;
    const nonmatchingPattern = /^world/;

    expect(isPatternMatch(matchingPattern, input)).toBe(true);
    expect(isPatternMatch(nonmatchingPattern, input)).toBe(false);
  });

  it('given a predicate, returns its result for the string', () => {
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

  it('given an array of string and RegExp patterns, returns true if a RegExp matches', () => {
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
