import { isRecord } from '../internal/isRecord.ts';
import { readArrayField } from '../internal/readArrayField.ts';
import type { JiraRequest } from './createTokenTransport.ts';
import { requestOk } from './requestOk.ts';

const SEARCH_PAGE_SIZE = 100;

/**
 * Collects every work-item key matched by a JQL query, following the search's page token to the end. The query
 * arrives composed: nothing here quotes a value into it.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function listIssueKeys(request: JiraRequest, jql: string): Promise<string[]> {
  const keys: string[] = [];
  let nextPageToken: string | undefined;

  do {
    const response = await requestOk(request, {
      body: {
        fields: ['key'],
        jql,
        maxResults: SEARCH_PAGE_SIZE,
        ...(nextPageToken !== undefined && { nextPageToken }),
      },
      label: `search '${jql}'`,
      method: 'POST',
      path: '/rest/api/3/search/jql',
    });

    // A key dropped here is a work item on which the caller never acts, so an unreadable entry refuses the whole walk.
    const issues = readArrayField(response.json, 'issues') ?? [];
    const page = issues.flatMap((issue) => (isRecord(issue) && typeof issue['key'] === 'string' ? [issue['key']] : []));
    if (page.length !== issues.length) {
      throw new Error(`Search '${jql}' answered with work items that this cannot read.`);
    }
    keys.push(...page);

    nextPageToken = readNextPageToken(response.json);
  } while (nextPageToken !== undefined);

  return keys;
}

// region | Helpers

/** Narrows a search response's page token, whose absence is what ends the walk. */
function readNextPageToken(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  const token = payload['nextPageToken'];

  return typeof token === 'string' && token !== '' ? token : undefined;
}

// endregion | Helpers
