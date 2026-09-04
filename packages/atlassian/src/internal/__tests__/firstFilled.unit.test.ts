import { describe, expect, it } from 'vitest';

import { firstFilled } from '../firstFilled.ts';

describe(firstFilled, () => {
  it('answers the first value carrying content', () => {
    expect(firstFilled(undefined, 'second', 'third')).toBe('second');
  });

  it('trims the value it answers', () => {
    expect(firstFilled('  padded  ')).toBe('padded');
  });

  it('passes over a value that is only whitespace', () => {
    expect(firstFilled(' '.repeat(3), 'real')).toBe('real');
  });

  it('answers undefined where every value is empty', () => {
    expect(firstFilled(undefined, '', '  ')).toBeUndefined();
  });
});
