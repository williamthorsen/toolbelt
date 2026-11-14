import { isRecord } from '@williamthorsen/toolbelt.objects';
import { describe, expect, it } from 'vitest';

import { JiraResponseError } from '../../3-candidate/JiraResponseError.ts';
import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { listSearchMatches } from '../listSearchMatches.ts';

const SEARCH_PATH = 'POST /rest/api/3/search/jql';
const JQL = 'project = "PROJ"';

describe(listSearchMatches, () => {
  it('follows the page token and returns every page in order', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: buildIssues(1, 2), nextPageToken: 'page-2' } },
          { json: { issues: buildIssues(3, 1), nextPageToken: 'page-3' } },
          { json: { issues: buildIssues(4, 1) } },
        ],
      },
    });

    const keys = await listSearchMatches(request, { fields: ['key'], jql: JQL, readIssue: readKey });

    expect(keys).toStrictEqual(['PROJ-1', 'PROJ-2', 'PROJ-3', 'PROJ-4']);
    expect(calls).toHaveLength(3);
  });

  it('passes the previous page token into the next request and none into the first', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: { sequence: [{ json: { issues: [], nextPageToken: 'page-2' } }, { json: { issues: [] } }] },
    });

    await listSearchMatches(request, { fields: ['key'], jql: JQL, readIssue: readKey });

    expect(calls.map((call) => call.body)).toStrictEqual([
      { fields: ['key'], jql: JQL, maxResults: 100 },
      { fields: ['key'], jql: JQL, maxResults: 100, nextPageToken: 'page-2' },
    ]);
  });

  it('stops on an empty page token rather than walking forever', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: buildIssues(1, 1), nextPageToken: '' } },
    });

    await expect(listSearchMatches(request, { fields: ['key'], jql: JQL, readIssue: readKey })).resolves.toStrictEqual([
      'PROJ-1',
    ]);
    expect(calls).toHaveLength(1);
  });

  it('returns an empty list when nothing matches', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: [] } } });

    await expect(listSearchMatches(request, { fields: ['key'], jql: JQL, readIssue: readKey })).resolves.toStrictEqual(
      [],
    );
  });

  it('asks each page for only what remains of the limit', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: buildIssues(1, 100), nextPageToken: 'page-2' } },
          { json: { issues: buildIssues(101, 50), nextPageToken: 'page-3' } },
        ],
      },
    });

    const keys = await listSearchMatches(request, { fields: ['key'], jql: JQL, limit: 150, readIssue: readKey });

    expect(keys).toHaveLength(150);
    expect(calls.map((call) => call.body)).toStrictEqual([
      { fields: ['key'], jql: JQL, maxResults: 100 },
      { fields: ['key'], jql: JQL, maxResults: 50, nextPageToken: 'page-2' },
    ]);
  });

  it('keeps following the token when a page returns fewer items than it asked for', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: buildIssues(1, 3), nextPageToken: 'page-2' } },
          { json: { issues: buildIssues(4, 2) } },
        ],
      },
    });

    await expect(
      listSearchMatches(request, { fields: ['key'], jql: JQL, limit: 10, readIssue: readKey }),
    ).resolves.toHaveLength(5);
    expect(calls).toHaveLength(2);
  });

  it('returns fewer than the limit when the search runs out', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: buildIssues(1, 2) } } });

    await expect(
      listSearchMatches(request, { fields: ['key'], jql: JQL, limit: 20, readIssue: readKey }),
    ).resolves.toHaveLength(2);
  });

  it('never returns more than the limit, even when a page does', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: buildIssues(1, 5) } } });

    await expect(
      listSearchMatches(request, { fields: ['key'], jql: JQL, limit: 3, readIssue: readKey }),
    ).resolves.toStrictEqual(['PROJ-1', 'PROJ-2', 'PROJ-3']);
  });

  it('refuses a page with an unreadable work item rather than dropping it from the walk', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: [{ key: 'PROJ-1' }, { id: '1' }] } } });

    const reading = listSearchMatches(request, { fields: ['key'], jql: JQL, readIssue: readKey });

    await expect(reading).rejects.toThrow(`Search '${JQL}' returned work items that this cannot read.`);
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('refuses a response without an issues array rather than reading it as no matches', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: {} } });

    const reading = listSearchMatches(request, { fields: ['key'], jql: JQL, readIssue: readKey });

    await expect(reading).rejects.toThrow(`Search '${JQL}' returned no 'issues' array.`);
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });
});

// region | Helpers

/** Builds `count` consecutive search results, starting at `first`. */
function buildIssues(first: number, count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => ({ key: `PROJ-${first + index}` }));
}

/** Narrows a search result to its key. */
function readKey(issue: unknown): string | undefined {
  return isRecord(issue) && typeof issue['key'] === 'string' ? issue['key'] : undefined;
}

// endregion | Helpers
