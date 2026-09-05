import { describe, expect, it } from 'vitest';

import { listStringLeaves } from '../listStringLeaves.ts';

describe(listStringLeaves, () => {
  it('returns a bare string as the only leaf', () => {
    expect(listStringLeaves('./dist/esm/4-release/index.js')).toStrictEqual(['./dist/esm/4-release/index.js']);
  });

  it('descends through the nested condition objects used by an exports map', () => {
    const exports = { '.': { import: './a.js' }, './candidate': { import: './b.js' } };

    expect(listStringLeaves(exports)).toStrictEqual(['./a.js', './b.js']);
  });

  it('descends through an array fallback', () => {
    const exports = { '.': [{ import: './a.js' }, './b.js'] };

    expect(listStringLeaves(exports)).toStrictEqual(['./a.js', './b.js']);
  });

  it('ignores leaves that hold no string', () => {
    expect(listStringLeaves({ a: 1, b: null, c: undefined, d: true })).toStrictEqual([]);
  });

  it('returns nothing for a value that is neither string, object, nor array', () => {
    expect(listStringLeaves(undefined)).toStrictEqual([]);
  });
});
