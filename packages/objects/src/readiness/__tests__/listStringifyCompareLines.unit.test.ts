import { describe, expect, it } from 'vitest';

import { listStringifyCompareLines } from '../listStringifyCompareLines.ts';

describe(listStringifyCompareLines, () => {
  it('claims an equality test between two calls', () => {
    expect(listStringifyCompareLines('const same = JSON.stringify(a) === JSON.stringify(b);\n')).toStrictEqual([1]);
  });

  it('claims the inequality mirror', () => {
    expect(listStringifyCompareLines('const differs = JSON.stringify(a) !== JSON.stringify(b);\n')).toStrictEqual([1]);
  });

  // The anchor alone would stop at the first inner parenthesis, which is why the argument list is read as a
  // balanced group.
  it('claims a comparison whose arguments carry parentheses of their own', () => {
    const source = 'const same = JSON.stringify(pick(a, keys())) === JSON.stringify(pick(b, keys()));\n';

    expect(listStringifyCompareLines(source)).toStrictEqual([1]);
  });

  it('claims a comparison a formatter broke across lines, at the line it opens on', () => {
    const source = 'const same =\n  JSON.stringify(a) ===\n  JSON.stringify(b);\n';

    expect(listStringifyCompareLines(source)).toStrictEqual([2]);
  });

  it('claims each of several comparisons in one source', () => {
    const source = [
      'const one = JSON.stringify(a) === JSON.stringify(b);',
      'const two = JSON.stringify(c) !== JSON.stringify(d);',
      '',
    ].join('\n');

    expect(listStringifyCompareLines(source)).toStrictEqual([1, 2]);
  });

  it('declines a call compared against a literal, which serializes rather than compares', () => {
    expect(listStringifyCompareLines("const empty = JSON.stringify(a) === '{}';\n")).toStrictEqual([]);
  });

  it('declines a call compared against a variable', () => {
    expect(listStringifyCompareLines('const same = JSON.stringify(a) === expected;\n')).toStrictEqual([]);
  });

  it('declines a call the source does not compare', () => {
    expect(listStringifyCompareLines('const text = JSON.stringify(a, undefined, 2);\n')).toStrictEqual([]);
  });

  it('declines an argument list that never closes', () => {
    expect(listStringifyCompareLines('const broken = JSON.stringify(a === JSON.stringify(b);\n')).toStrictEqual([]);
  });
});
