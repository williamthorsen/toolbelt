import { isRecord } from '@williamthorsen/toolbelt.objects';

import { listSearchMatches } from '../internal/listSearchMatches.ts';
import type { JiraRequest } from './createTokenTransport.ts';

/**
 * Collects every work-item key matched by a JQL query, following the search's page token to the end. The caller
 * composes the query: Nothing here quotes a value into it.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function listIssueKeys(request: JiraRequest, jql: string): Promise<string[]> {
  return listSearchMatches(request, { fields: ['key'], jql, readIssue: readIssueKey });
}

// region | Helpers

/** Narrows one search result to its key. */
function readIssueKey(issue: unknown): string | undefined {
  return isRecord(issue) && typeof issue['key'] === 'string' ? issue['key'] : undefined;
}

// endregion | Helpers
