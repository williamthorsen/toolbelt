import type { ExitMockKind } from './classifyExitMock.ts';
import type { Finding, ProjectSummary } from './summarizeSources.ts';

export interface KindReport {
  detail?: string;
  ok: boolean;
  progress: { count: number; passedCount: number; type: 'fraction' };
}

/**
 * Reports whether a project holds mocks of the named kinds, naming each and how far adoption got.
 *
 * The fraction spans every mock the project holds, not only those of the named kinds, so the checks of one run
 * report one denominator a reader can compare across them.
 *
 * @internal
 */
export function buildKindReport(summary: ProjectSummary, kinds: readonly ExitMockKind[]): KindReport {
  const named = summary.findings.filter((finding) => kinds.includes(finding.kind));
  const progress = {
    count: summary.adopted + summary.findings.length,
    passedCount: summary.adopted,
    type: 'fraction',
  } as const;

  if (named.length === 0) return { ok: true, progress };
  return { detail: named.map((finding) => describeFinding(finding)).join(', '), ok: false, progress };
}

// region | Helpers

/** Names one finding by where it is, and by the sentinel class it declares where it declares one. */
function describeFinding(finding: Finding): string {
  const location = `${finding.path}:${finding.line}`;
  return finding.symbol === undefined ? location : `${finding.symbol} (${location})`;
}

// endregion | Helpers
