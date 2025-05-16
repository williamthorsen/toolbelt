import { describe, expect, it } from 'vitest';

import { includes } from '../includes.ts';

describe(includes, () => {
  it('returns true if the array includes the item', () => {
    const items = [1, 2, 3];

    expect(includes(items, 2)).toBe(true);
  });

  it('returns false if the array does not include the item', () => {
    const items = [1, 2, 3];

    expect(includes(items, 4)).toBe(false);
  });

  it('works correctly with readonly arrays', () => {
    const items = ['a', 'b', 'c'] as const;

    expect(includes(items, 'b')).toBe(true);
    expect(includes(items, 'd')).toBe(false);
  });

  it('works correctly with array of different types', () => {
    const items = [1, 'a', true, null, undefined] as const;

    expect(includes(items, 1)).toBe(true);
    expect(includes(items, 'a')).toBe(true);
    expect(includes(items, true)).toBe(true);
    expect(includes(items, null)).toBe(true);
    expect(includes(items, undefined)).toBe(true);
    expect(includes(items, 'b')).toBe(false);
  });
});
