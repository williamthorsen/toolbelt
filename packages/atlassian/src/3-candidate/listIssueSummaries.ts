import { isRecord } from '../internal/isRecord.ts';
import { readArrayField } from '../internal/readArrayField.ts';
import { readNextPageToken } from '../internal/readNextPageToken.ts';
import type { JiraRequest } from './createTokenTransport.ts';
import { requestOk } from './requestOk.ts';

/** The most that the search returns in one page when fields beyond the key are requested. */
const SEARCH_PAGE_SIZE = 100;

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

  const summaries: IssueSummary[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await requestOk(request, {
      body: {
        fields: ['status', 'summary'],
        jql,
        maxResults: Math.min(limit - summaries.length, SEARCH_PAGE_SIZE),
        ...(nextPageToken !== undefined && { nextPageToken }),
      },
      label: `search '${jql}'`,
      method: 'POST',
      path: '/rest/api/3/search/jql',
    });

    const issues = readArrayField(response.json, 'issues') ?? [];
    const page = issues.flatMap((issue) => {
      const summary = readIssueSummary(issue);
      return summary === undefined ? [] : [summary];
    });
    if (page.length !== issues.length) {
      throw new Error(`Search '${jql}' returned work items that this cannot read.`);
    }
    summaries.push(...page.slice(0, limit - summaries.length));

    nextPageToken = readNextPageToken(response.json);
  } while (nextPageToken !== undefined && summaries.length < limit);

  return summaries;
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
