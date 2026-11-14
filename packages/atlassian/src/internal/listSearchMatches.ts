import type { JiraRequest } from '../3-candidate/createTokenTransport.ts';
import { JiraResponseError } from '../3-candidate/JiraResponseError.ts';
import { requestOk } from '../3-candidate/requestOk.ts';
import { readArrayField } from './readArrayField.ts';
import { readEvery } from './readEvery.ts';
import { readFilledStringField } from './readFilledStringField.ts';

/** The most that the search returns in one page when fields beyond the key are requested, and so the size asked for. */
const SEARCH_PAGE_SIZE = 100;

/**
 * Collects the work items matched by a JQL query, in the query's order, following the search's page token until
 * the pages run out or, when `limit` is set, until it is reached. `limit` is a positive integer, which the caller
 * validates.
 *
 * @internal
 */
export async function listSearchMatches<T>(request: JiraRequest, query: SearchQuery<T>): Promise<T[]> {
  const { fields, jql, limit = Infinity, readIssue } = query;

  const matches: T[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await requestOk(request, {
      body: {
        fields,
        jql,
        maxResults: Math.min(limit - matches.length, SEARCH_PAGE_SIZE),
        ...(nextPageToken !== undefined && { nextPageToken }),
      },
      label: `search '${jql}'`,
      method: 'POST',
      path: '/rest/api/3/search/jql',
    });

    const issues = readArrayField(response.json, 'issues');
    if (issues === undefined) {
      throw new JiraResponseError({ message: `Search '${jql}' returned no 'issues' array.`, url: response.url });
    }
    // A match dropped here is a work item on which the caller never acts, so one unreadable entry fails the whole
    // walk.
    const page = readEvery(issues, readIssue);
    if (page === undefined) {
      throw new JiraResponseError({
        message: `Search '${jql}' returned work items that this cannot read.`,
        url: response.url,
      });
    }
    matches.push(...page.slice(0, limit - matches.length));

    nextPageToken = readFilledStringField(response.json, 'nextPageToken');
  } while (nextPageToken !== undefined && matches.length < limit);

  return matches;
}

export interface SearchQuery<T> {
  readonly fields: readonly string[];
  readonly jql: string;
  readonly limit?: number;
  /** Narrows one search result, returning `undefined` when it is unreadable. */
  readonly readIssue: (issue: unknown) => T | undefined;
}
