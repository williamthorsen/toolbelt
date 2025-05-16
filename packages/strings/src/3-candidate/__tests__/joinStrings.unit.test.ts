import { describe, expect, it } from 'vitest';

import { joinStrings } from '../joinStrings.ts';

describe(joinStrings, () => {
  it('joins strings with the default separator', () => {
    const strings = ['hello', 'world', 'typescript'];
    const result = joinStrings(strings);
    expect(result).toBe('hello world typescript');
  });

  it('joins strings with a custom separator', () => {
    const strings = ['hello', 'world', 'typescript'];
    const result = joinStrings(strings, { separator: '-' });
    expect(result).toBe('hello-world-typescript');
  });

  it('uses a different separator for the last element', () => {
    const strings = ['hello', 'world', 'typescript'];
    const result = joinStrings(strings, { separator: ',', lastSeparator: ' and ' });
    expect(result).toBe('hello,world and typescript');
  });

  it('omits null and undefined values', () => {
    const strings = ['hello', null, undefined, 'world'];
    const result = joinStrings(strings);
    expect(result).toBe('hello world');
  });

  it('returns an empty string for an empty array', () => {
    const strings: string[] = [];
    const result = joinStrings(strings);
    expect(result).toBe('');
  });

  it('returns the single string if only one non-empty string is provided', () => {
    const strings = [null, 'hello', undefined];
    const result = joinStrings(strings);
    expect(result).toBe('hello');
  });

  it('handles an array with only null or undefined values', () => {
    const strings = [null, undefined];
    const result = joinStrings(strings);
    expect(result).toBe('');
  });

  it('uses the same separator if lastSeparator is not provided', () => {
    const strings = ['hello', 'world'];
    const result = joinStrings(strings, { separator: '-' });
    expect(result).toBe('hello-world');
  });
});
