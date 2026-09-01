import { describe, expect, it } from 'vitest';

import { listClampNestLines } from '../listClampNestLines.ts';

describe(listClampNestLines, () => {
  it('claims a clamp in either nesting order', () => {
    const source = 'const a = Math.max(min, Math.min(max, value));\nconst b = Math.min(max, Math.max(min, value));\n';

    expect(listClampNestLines(source)).toStrictEqual([1, 2]);
  });

  it('claims a clamp whose nested call is the first argument', () => {
    const source = 'const a = Math.min(Math.max(value, min), max);\n';

    expect(listClampNestLines(source)).toStrictEqual([1]);
  });

  it('reports a clamp once rather than once per bounding call', () => {
    expect(listClampNestLines('Math.max(0, Math.min(1, x));\n')).toHaveLength(1);
  });

  it('claims a clamp broken across lines by a formatter, at the line it opens on', () => {
    const source = 'const a = Math.max(\n  lowerBound,\n  Math.min(upperBound, value),\n);\n';

    expect(listClampNestLines(source)).toStrictEqual([1]);
  });

  it('declines a bounding call with no nested opposite', () => {
    const sources = ['Math.max(a, b);\n', 'Math.min(a, b);\n', 'Math.max(a, Math.max(b, c));\n'];

    expect(sources.filter((source) => listClampNestLines(source).length > 0)).toStrictEqual([]);
  });

  // The larger of `a` and the smallest of three is not a clamp, and `clamp` cannot express it.
  it('declines a nested call taking three arguments', () => {
    expect(listClampNestLines('Math.max(a, Math.min(b, c, d));\n')).toStrictEqual([]);
  });

  it('declines a nested call with an operand appended to it', () => {
    expect(listClampNestLines('Math.max(a, Math.min(b, c) + 1);\n')).toStrictEqual([]);
  });

  it('declines a spread, which bounds a list rather than a value', () => {
    expect(listClampNestLines('Math.max(...values);\n')).toStrictEqual([]);
  });

  // The outer call is not a clamp, so its span never claims the inner one, which is.
  it('claims a clamp nested inside a call that is not one', () => {
    expect(listClampNestLines('Math.max(a, b, Math.min(c, Math.max(d, e)));\n')).toStrictEqual([1]);
  });
});
