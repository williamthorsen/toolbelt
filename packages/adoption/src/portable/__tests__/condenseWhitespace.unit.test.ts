import { describe, expect, it } from 'vitest';

import { condenseWhitespace } from '../condenseWhitespace.ts';

describe(condenseWhitespace, () => {
  it('collapses a run of spaces to one', () => {
    expect(condenseWhitespace('a    b')).toBe('a b');
  });

  it('reads a wrapped expression as its single-line form', () => {
    const wrapped = 'error instanceof Error\n      ? error.message\n      : String(error)';

    expect(condenseWhitespace(wrapped)).toBe('error instanceof Error ? error.message : String(error)');
  });

  it('leaves text holding no whitespace run unchanged', () => {
    expect(condenseWhitespace('a b')).toBe('a b');
  });
});
