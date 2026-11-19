import { describe, expect, it } from 'vitest';

import { isIntegerString } from '../isIntegerString.ts';

describe(isIntegerString, () => {
  it('returns true for a valid integer string', () => {
    expect(isIntegerString('42')).toBe(true);
  });

  it('returns false for a non-numeric string', () => {
    expect(isIntegerString('abc')).toBe(false);
  });

  it('returns false for a non-integer numeric string', () => {
    expect(isIntegerString('42.5')).toBe(false);
  });

  it.each([null, undefined])('return false for %s', (value) => {
    expect(isIntegerString(value)).toBe(false);
  });

  it('return false for a string with mixed characters', () => {
    expect(isIntegerString('123abc')).toBe(false);
  });
});
