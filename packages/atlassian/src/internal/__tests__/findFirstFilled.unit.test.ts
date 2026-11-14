import { describe, expect, it } from 'vitest';

import { findFirstFilled } from '../findFirstFilled.ts';

describe(findFirstFilled, () => {
  it('returns the first value that contains content', () => {
    expect(findFirstFilled(undefined, 'second', 'third')).toBe('second');
  });

  it('trims the value that it returns', () => {
    expect(findFirstFilled('  padded  ')).toBe('padded');
  });

  it('passes over a value that is only whitespace', () => {
    expect(findFirstFilled(' '.repeat(3), 'real')).toBe('real');
  });

  it('returns undefined when every value is empty', () => {
    expect(findFirstFilled(undefined, '', '  ')).toBeUndefined();
  });
});
