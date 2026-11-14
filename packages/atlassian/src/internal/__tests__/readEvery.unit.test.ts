import { describe, expect, it } from 'vitest';

import { readEvery } from '../readEvery.ts';

describe(readEvery, () => {
  it('returns every narrowed entry in order', () => {
    expect(readEvery(['a', 'b'], readString)).toStrictEqual(['a', 'b']);
  });

  it('returns an empty list for an empty input', () => {
    expect(readEvery([], readString)).toStrictEqual([]);
  });

  it('returns undefined when any entry is unreadable, rather than dropping it', () => {
    expect(readEvery(['a', 1, 'b'], readString)).toBeUndefined();
  });
});

// region | Helpers

/** Narrows a value to a string. */
function readString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

// endregion | Helpers
