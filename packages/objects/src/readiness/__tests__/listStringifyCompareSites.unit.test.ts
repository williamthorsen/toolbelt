import { listSiteLines } from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

import { listStringifyCompareSites } from '../listStringifyCompareSites.ts';

describe(listStringifyCompareSites, () => {
  it('claims an equality test between two calls', () => {
    expect(
      listSiteLines(listStringifyCompareSites, 'const same = JSON.stringify(a) === JSON.stringify(b);\n'),
    ).toStrictEqual([1]);
  });

  it('claims the inequality mirror', () => {
    expect(
      listSiteLines(listStringifyCompareSites, 'const differs = JSON.stringify(a) !== JSON.stringify(b);\n'),
    ).toStrictEqual([1]);
  });

  // Both operands are strings, so the loose test returns exactly what the strict one returns.
  it('claims a loose equality test', () => {
    expect(
      listSiteLines(listStringifyCompareSites, 'const same = JSON.stringify(a) == JSON.stringify(b);\n'),
    ).toStrictEqual([1]);
  });

  it('claims the loose inequality mirror', () => {
    expect(
      listSiteLines(listStringifyCompareSites, 'const differs = JSON.stringify(a) != JSON.stringify(b);\n'),
    ).toStrictEqual([1]);
  });

  // The anchor alone would stop at the first inner parenthesis, which is why the argument list is read as a
  // balanced group.
  it('claims a comparison whose arguments contain parentheses of their own', () => {
    const source = 'const same = JSON.stringify(pick(a, keys())) === JSON.stringify(pick(b, keys()));\n';

    expect(listSiteLines(listStringifyCompareSites, source)).toStrictEqual([1]);
  });

  it('claims a comparison broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const same =\n  JSON.stringify(a) ===\n  JSON.stringify(b);\n';

    expect(listSiteLines(listStringifyCompareSites, source)).toStrictEqual([2]);
  });

  it('claims each of several comparisons in one source', () => {
    const source = dedent`
      const one = JSON.stringify(a) === JSON.stringify(b);
      const two = JSON.stringify(c) !== JSON.stringify(d);

    `;

    expect(listSiteLines(listStringifyCompareSites, source)).toStrictEqual([1, 2]);
  });

  it('declines a call compared against a literal, which serializes rather than compares', () => {
    expect(listSiteLines(listStringifyCompareSites, "const empty = JSON.stringify(a) === '{}';\n")).toStrictEqual([]);
  });

  it('declines a call compared against a variable', () => {
    expect(listSiteLines(listStringifyCompareSites, 'const same = JSON.stringify(a) === expected;\n')).toStrictEqual(
      [],
    );
  });

  it('declines a call that the source does not compare', () => {
    expect(listSiteLines(listStringifyCompareSites, 'const text = JSON.stringify(a, undefined, 2);\n')).toStrictEqual(
      [],
    );
  });

  it('declines an argument list that never closes', () => {
    expect(
      listSiteLines(listStringifyCompareSites, 'const broken = JSON.stringify(a === JSON.stringify(b);\n'),
    ).toStrictEqual([]);
  });
});
