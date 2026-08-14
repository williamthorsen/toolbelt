import { describe, expect, it } from 'vitest';

import { buildKindReport } from '../buildKindReport.ts';
import type { ProjectSummary } from '../summarizeSources.ts';

const PROGRESS = { count: 3, passedCount: 1, type: 'fraction' } as const;

const SUMMARY: ProjectSummary = {
  adopted: 1,
  findings: [
    { kind: 'non-throwing', line: 4, path: 'a.test.ts' },
    { kind: 'sentinel-clone', line: 9, path: 'b.test.ts', symbol: 'ExitError' },
  ],
  sourceCount: 2,
};

describe(buildKindReport, () => {
  it('passes where the project holds no mock of the named kinds', () => {
    expect(buildKindReport(SUMMARY, ['throwing'])).toStrictEqual({ ok: true, progress: PROGRESS });
  });

  it('names each finding by location', () => {
    expect(buildKindReport(SUMMARY, ['non-throwing'])).toStrictEqual({
      detail: 'a.test.ts:4',
      ok: false,
      progress: PROGRESS,
    });
  });

  it('names the sentinel class where a finding declares one', () => {
    expect(buildKindReport(SUMMARY, ['sentinel-clone'])).toStrictEqual({
      detail: 'ExitError (b.test.ts:9)',
      ok: false,
      progress: PROGRESS,
    });
  });

  it('counts every mock in the denominator, not only the named kinds', () => {
    expect(buildKindReport(SUMMARY, ['non-throwing']).progress).toStrictEqual(PROGRESS);
  });
});
