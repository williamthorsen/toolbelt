import { describe, expect, it } from 'vitest';

import { isReverseMappingKey } from '../isReverseMappingKey.ts';

describe(isReverseMappingKey, () => {
  it('returns true for a numeric key', () => {
    expect(isReverseMappingKey('1')).toBe(true);
  });

  it('returns false for a member name', () => {
    expect(isReverseMappingKey('One')).toBe(false);
  });
});
