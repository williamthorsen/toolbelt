import { describe, expect, it } from 'vitest';

import { isReverseMappingKey } from '../isReverseMappingKey.ts';

enum NumericEnum {
  One = 1,
  Negative = -1,
}

describe(isReverseMappingKey, () => {
  it.each(['1', '-1'])('returns true for the reverse-mapping key %s of a numeric enum', (key) => {
    expect(isReverseMappingKey(NumericEnum, key)).toBe(true);
  });

  it('returns false for a member name', () => {
    expect(isReverseMappingKey(NumericEnum, 'One')).toBe(false);
  });

  it('returns false for a numeric-string key of a plain object', () => {
    expect(isReverseMappingKey({ 200: 'OK' }, '200')).toBe(false);
  });

  it('returns false for an empty-string key', () => {
    expect(isReverseMappingKey({ '': 'none' }, '')).toBe(false);
  });
});
