import { listSiteLines } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listClampNestSites } from '../listClampNestSites.ts';

describe(listClampNestSites, () => {
  it('claims a clamp in either nesting order', () => {
    const source = 'const a = Math.max(min, Math.min(max, value));\nconst b = Math.min(max, Math.max(min, value));\n';

    expect(listSiteLines(listClampNestSites, source)).toStrictEqual([1, 2]);
  });

  it('claims a clamp whose nested call is the first argument', () => {
    const source = 'const a = Math.min(Math.max(value, min), max);\n';

    expect(listSiteLines(listClampNestSites, source)).toStrictEqual([1]);
  });

  it('reports a clamp once rather than once per bounding call', () => {
    expect(listSiteLines(listClampNestSites, 'Math.max(0, Math.min(1, x));\n')).toHaveLength(1);
  });

  it('claims a clamp broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const a = Math.max(\n  lowerBound,\n  Math.min(upperBound, value),\n);\n';

    expect(listSiteLines(listClampNestSites, source)).toStrictEqual([1]);
  });

  it('declines a bounding call with no nested opposite', () => {
    const sources = ['Math.max(a, b);\n', 'Math.min(a, b);\n', 'Math.max(a, Math.max(b, c));\n'];

    expect(sources.filter((source) => listSiteLines(listClampNestSites, source).length > 0)).toStrictEqual([]);
  });

  // The larger of `a` and the smallest of three is not a clamp, and `clamp` cannot express it.
  it('declines a nested call taking three arguments', () => {
    expect(listSiteLines(listClampNestSites, 'Math.max(a, Math.min(b, c, d));\n')).toStrictEqual([]);
  });

  it('declines a nested call with an operand appended to it', () => {
    expect(listSiteLines(listClampNestSites, 'Math.max(a, Math.min(b, c) + 1);\n')).toStrictEqual([]);
  });

  it('declines a spread, which bounds a list rather than a value', () => {
    expect(listSiteLines(listClampNestSites, 'Math.max(...values);\n')).toStrictEqual([]);
  });

  // The outer call is not a clamp, so its span never claims the inner one, which is.
  it('claims a clamp nested inside a call that is not one', () => {
    expect(listSiteLines(listClampNestSites, 'Math.max(a, b, Math.min(c, Math.max(d, e)));\n')).toStrictEqual([1]);
  });

  // An interpolated expression is code that runs, so the idiom in it is one that a consumer can retire.
  it('claims a clamp interpolated into a template literal', () => {
    expect(
      listSiteLines(listClampNestSites, 'const label = `bounded to ${Math.max(min, Math.min(max, value))}`;\n'),
    ).toStrictEqual([1]);
  });
});
