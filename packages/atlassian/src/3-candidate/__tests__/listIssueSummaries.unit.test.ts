import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { JiraResponseError } from '../JiraResponseError.ts';
import { listIssueSummaries } from '../listIssueSummaries.ts';

const SEARCH_PATH = 'POST /rest/api/3/search/jql';
const JQL = 'project = "PROJ" ORDER BY created DESC';

describe(listIssueSummaries, () => {
  it('returns the key, status name, and summary of each work item in order', async () => {
    const { request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: [buildIssue(2, 'In Progress'), buildIssue(1, 'To Do')] } },
    });

    await expect(listIssueSummaries(request, { jql: JQL, limit: 20 })).resolves.toStrictEqual([
      { key: 'PROJ-2', status: 'In Progress', summary: 'Work item 2' },
      { key: 'PROJ-1', status: 'To Do', summary: 'Work item 1' },
    ]);
  });

  it('requests the status and summary fields, and no more items than the limit', async () => {
    const { calls, request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: [] } } });

    await listIssueSummaries(request, { jql: JQL, limit: 20 });

    expect(calls[0]?.body).toStrictEqual({ fields: ['status', 'summary'], jql: JQL, maxResults: 20 });
  });

  it('follows the page token past one page, asking each page for only what remains', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: buildIssues(1, 100), nextPageToken: 'page-2' } },
          { json: { issues: buildIssues(101, 50), nextPageToken: 'page-3' } },
        ],
      },
    });

    const summaries = await listIssueSummaries(request, { jql: JQL, limit: 150 });

    expect(summaries).toHaveLength(150);
    expect(calls.map((call) => call.body)).toStrictEqual([
      { fields: ['status', 'summary'], jql: JQL, maxResults: 100 },
      { fields: ['status', 'summary'], jql: JQL, maxResults: 50, nextPageToken: 'page-2' },
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

    await expect(listIssueSummaries(request, { jql: JQL, limit: 10 })).resolves.toHaveLength(5);
    expect(calls).toHaveLength(2);
  });

  it('returns fewer than the limit when the search runs out', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: buildIssues(1, 2) } } });

    await expect(listIssueSummaries(request, { jql: JQL, limit: 20 })).resolves.toHaveLength(2);
  });

  it('never returns more than the limit, even when a page does', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: buildIssues(1, 5) } } });

    await expect(listIssueSummaries(request, { jql: JQL, limit: 3 })).resolves.toHaveLength(3);
  });

  it('reads an empty summary or status name as it is', async () => {
    const { request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: [{ fields: { status: { name: '' }, summary: '' }, key: 'PROJ-1' }] } },
    });

    await expect(listIssueSummaries(request, { jql: JQL, limit: 1 })).resolves.toStrictEqual([
      { key: 'PROJ-1', status: '', summary: '' },
    ]);
  });

  it.each([
    ['a missing key', { fields: { status: { name: 'To Do' }, summary: 'S' } }],
    ['an empty key', { fields: { status: { name: 'To Do' }, summary: 'S' }, key: '' }],
    ['a missing status', { fields: { summary: 'S' }, key: 'PROJ-1' }],
    ['a missing summary', { fields: { status: { name: 'To Do' } }, key: 'PROJ-1' }],
  ])('refuses a work item with %s rather than dropping it', async (_case, issue) => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: [issue] } } });

    const reading = listIssueSummaries(request, { jql: JQL, limit: 20 });

    await expect(reading).rejects.toThrow('returned work items that this cannot read');
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('refuses a response without an issues array rather than reading it as no matches', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: {} } });

    const reading = listIssueSummaries(request, { jql: JQL, limit: 20 });

    await expect(reading).rejects.toThrow("returned no 'issues' array");
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it.each([0, -1, 1.5])('refuses a limit of %d before issuing any request', async (limit) => {
    const { calls, request } = createFakeRequest({});

    await expect(listIssueSummaries(request, { jql: JQL, limit })).rejects.toThrow('A limit is a positive integer');
    expect(calls).toHaveLength(0);
  });

  it('throws naming the query when the search is rejected', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { errorMessages: [] }, status: 400 } });

    await expect(listIssueSummaries(request, { jql: JQL, limit: 20 })).rejects.toMatchObject({
      label: `search '${JQL}'`,
      status: 400,
    });
  });
});

// region | Helpers

/** Builds one search result in the shape that the search returns. */
function buildIssue(id: number, status = 'To Do'): unknown {
  return { fields: { status: { name: status }, summary: `Work item ${id}` }, key: `PROJ-${id}` };
}

/** Builds `count` consecutive search results, starting at `first`. */
function buildIssues(first: number, count: number): unknown[] {
  return Array.from({ length: count }, (_, index) => buildIssue(first + index));
}

// endregion | Helpers
