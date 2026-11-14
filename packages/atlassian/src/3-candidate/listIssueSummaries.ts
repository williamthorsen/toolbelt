import { isRecord } from '@williamthorsen/toolbelt.objects';

import { listSearchMatches } from '../internal/listSearchMatches.ts';
import type { JiraRequest } from './createTokenTransport.ts';

/**
 * Collects up to `limit` work items matched by a JQL query, in the query's order, following the search's page
 * token until the limit is reached or the pages run out. `limit` is a positive integer. The caller composes the
 * query: Nothing here quotes a value into it.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function listIssueSummaries(request: JiraRequest, options: IssueSummaryQuery): Promise<IssueSummary[]> {
  const { jql, limit } = options;
  if (!Number.isSafeInteger(limit) || limit < 1)
    throw new RangeError(`A limit is a positive integer. Received ${limit}.`);

  return listSearchMatches(request, { fields: ['status', 'summary'], jql, limit, readIssue: readIssueSummary });
}

/** One work item as a listing shows it. */
export interface IssueSummary {
  readonly key: string;
  /** The name of the work item's current status. */
  readonly status: string;
  readonly summary: string;
}

export interface IssueSummaryQuery {
  readonly jql: string;
  readonly limit: number;
}

// region | Helpers

/** Narrows one search result to its key, status name, and summary, returning `undefined` when any is unreadable. */
function readIssueSummary(issue: unknown): IssueSummary | undefined {
  if (!isRecord(issue)) return undefined;

  const { fields, key } = issue;
  if (typeof key !== 'string' || key === '' || !isRecord(fields)) return undefined;

  const { status, summary } = fields;
  if (typeof summary !== 'string' || !isRecord(status) || typeof status['name'] !== 'string') return undefined;

  return { key, status: status['name'], summary };
}

// endregion | Helpers
