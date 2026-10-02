import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { JiraResponseError } from '../JiraResponseError.ts';
import { listIssueKeys } from '../listIssueKeys.ts';

const SEARCH_PATH = 'POST /rest/api/3/search/jql';
const JQL = 'project = "PROJ" AND status = "To Do"';

describe(listIssueKeys, () => {
  it('follows the page token and returns every page in order', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: [{ key: 'PROJ-1' }, { key: 'PROJ-2' }], nextPageToken: 'page-2' } },
          { json: { issues: [{ key: 'PROJ-3' }], nextPageToken: 'page-3' } },
          { json: { issues: [{ key: 'PROJ-4' }] } },
        ],
      },
    });

    const keys = await listIssueKeys(request, JQL);

    expect(keys).toStrictEqual(['PROJ-1', 'PROJ-2', 'PROJ-3', 'PROJ-4']);
    expect(calls).toHaveLength(3);
  });

  it('passes the previous page token into the next request and none into the first', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [{ json: { issues: [], nextPageToken: 'page-2' } }, { json: { issues: [] } }],
      },
    });

    await listIssueKeys(request, JQL);

    expect(calls[0]?.body).toStrictEqual({ fields: ['key'], jql: JQL, maxResults: 100 });
    expect(calls[1]?.body).toStrictEqual({ fields: ['key'], jql: JQL, maxResults: 100, nextPageToken: 'page-2' });
  });

  it('stops on an empty page token rather than walking forever', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: [{ key: 'PROJ-1' }], nextPageToken: '' } },
    });

    await expect(listIssueKeys(request, JQL)).resolves.toStrictEqual(['PROJ-1']);
    expect(calls).toHaveLength(1);
  });

  it('returns an empty list when nothing matches', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: [] } } });

    await expect(listIssueKeys(request, JQL)).resolves.toStrictEqual([]);
  });

  it('refuses a work item that it cannot read rather than dropping it from the walk', async () => {
    const { request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: [{ key: 'PROJ-1' }, { id: '10001' }] } },
    });

    const reading = listIssueKeys(request, JQL);

    await expect(reading).rejects.toThrow('returned work items that this cannot read');
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('refuses a response without an issues array rather than reading it as no matches', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: {} } });

    const reading = listIssueKeys(request, JQL);

    await expect(reading).rejects.toThrow("returned no 'issues' array");
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('throws naming the query when the search is rejected', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { errorMessages: [] }, status: 400 } });

    await expect(listIssueKeys(request, JQL)).rejects.toMatchObject({ label: `search '${JQL}'`, status: 400 });
  });
});
