import { describe, expect, it } from 'vitest';

import { joinTruthy } from '../joinTruthy.ts';

describe(joinTruthy, () => {
  it('joins strings with the default separator', () => {
    const strings = ['hello', 'world', 'typescript'];
    const result = joinTruthy(strings);
    expect(result).toBe('hello world typescript');
  });

  it('joins strings with a custom separator', () => {
    const strings = ['hello', 'world', 'typescript'];
    const result = joinTruthy(strings, { separator: '-' });
    expect(result).toBe('hello-world-typescript');
  });

  it('omits null and undefined values', () => {
    const strings = ['hello', null, undefined, 'world'];
    const result = joinTruthy(strings);
    expect(result).toBe('hello world');
  });

  it('omits empty strings', () => {
    const strings = ['hello', '', 'world'];
    const result = joinTruthy(strings);
    expect(result).toBe('hello world');
  });

  it('keeps a whitespace-only string', () => {
    const strings = ['hello', ' ', 'world'];
    const result = joinTruthy(strings, { separator: '-' });
    expect(result).toBe('hello- -world');
  });

  it('returns an empty string for an empty array', () => {
    const strings: string[] = [];
    const result = joinTruthy(strings);
    expect(result).toBe('');
  });

  it('returns the single string if only one truthy string is provided', () => {
    const strings = [null, 'hello', undefined];
    const result = joinTruthy(strings);
    expect(result).toBe('hello');
  });

  it('handles an array with only null or undefined values', () => {
    const strings = [null, undefined];
    const result = joinTruthy(strings);
    expect(result).toBe('');
  });
});
