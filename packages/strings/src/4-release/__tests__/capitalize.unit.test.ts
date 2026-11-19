import { describe, expect, it } from 'vitest';

import { capitalize } from '../capitalize.ts';

describe(capitalize, () => {
  it('uppercases the first letter', () => {
    expect(capitalize('word')).toBe('Word');
  });

  it('leaves the rest of the string as it is', () => {
    expect(capitalize('hELLO wORLD')).toBe('HELLO wORLD');
  });

  it('returns a string that already starts with a capital unchanged', () => {
    expect(capitalize('Word')).toBe('Word');
  });

  it('returns a string that starts with a non-letter unchanged', () => {
    expect(capitalize('1st place')).toBe('1st place');
  });

  it('returns the empty string for the empty string', () => {
    expect(capitalize('')).toBe('');
  });
});
