import type { ErrorSiteKind } from './listErrorSites.ts';
import type { Finding, ProjectSummary } from './summarizeSources.ts';

export interface KindReport {
  detail?: string;
  ok: boolean;
  progress: { count: number; passedCount: number; type: 'fraction' };
}

/**
 * Reports whether a project holds sites of the named kinds, naming each and how far adoption got.
 *
 * The fraction spans every site the project holds, not only those of the named kinds, so the four checks of
 * one run report one denominator a reader can compare across them.
 *
 * @internal
 */
export function buildKindReport(summary: ProjectSummary, kinds: readonly ErrorSiteKind[]): KindReport {
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

/** Names one finding by where it is, and by the helper it defines where it defines one. */
function describeFinding(finding: Finding): string {
  const location = `${finding.path}:${finding.line}`;
  return finding.symbol === undefined ? location : `${finding.symbol} (${location})`;
}

// endregion | Helpers
