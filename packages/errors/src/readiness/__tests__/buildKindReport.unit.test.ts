import { describe, expect, it } from 'vitest';

import { buildKindReport } from '../buildKindReport.ts';
import type { ErrorSiteKind } from '../listErrorSites.ts';
import type { ProjectSummary } from '../summarizeSources.ts';

const SUMMARY: ProjectSummary = {
  adopted: 3,
  findings: [
    { kind: 'describe-clone', line: 3, path: 'src/errors.ts', symbol: 'describeError' },
    { kind: 'describe-inline', line: 12, path: 'src/read.ts' },
    { kind: 'narrow', line: 40, path: 'src/read.ts' },
  ],
  sourceCount: 2,
};

describe(buildKindReport, () => {
  it('passes when the project holds no site of the named kinds', () => {
    expect(buildKindReport(SUMMARY, ['coerce'])).toStrictEqual({
      ok: true,
      progress: { count: 6, passedCount: 3, type: 'fraction' },
    });
  });

  it('names a clone by its function and its location', () => {
    expect(buildKindReport(SUMMARY, ['describe-clone']).detail).toBe('describeError (src/errors.ts:3)');
  });

  it('names each site of several kinds at once', () => {
    expect(buildKindReport(SUMMARY, ['describe-inline', 'narrow']).detail).toBe('src/read.ts:12, src/read.ts:40');
  });

  it('spans every site in the denominator, so one run reports one fraction', () => {
    const everyCheck: ErrorSiteKind[][] = [['describe-clone'], ['describe-inline'], ['assert', 'narrow'], ['coerce']];
    const fraction = { count: 6, passedCount: 3, type: 'fraction' };

    expect(everyCheck.map((kinds) => buildKindReport(SUMMARY, kinds).progress)).toStrictEqual([
      fraction,
      fraction,
      fraction,
      fraction,
    ]);
  });
});
