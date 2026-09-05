import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { listIssueKeys } from '../listIssueKeys.ts';

const SEARCH_PATH = 'POST /rest/api/3/search/jql';
const JQL = 'project = "THOR" AND status = "To Do"';

describe(listIssueKeys, () => {
  it('follows the page token and answers every page in order', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: [{ key: 'THOR-1' }, { key: 'THOR-2' }], nextPageToken: 'page-2' } },
          { json: { issues: [{ key: 'THOR-3' }], nextPageToken: 'page-3' } },
          { json: { issues: [{ key: 'THOR-4' }] } },
        ],
      },
    });

    const keys = await listIssueKeys(request, JQL);

    expect(keys).toStrictEqual(['THOR-1', 'THOR-2', 'THOR-3', 'THOR-4']);
    expect(calls).toHaveLength(3);
  });

  it('carries the previous page token into the next request and none into the first', async () => {
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
      [SEARCH_PATH]: { json: { issues: [{ key: 'THOR-1' }], nextPageToken: '' } },
    });

    await expect(listIssueKeys(request, JQL)).resolves.toStrictEqual(['THOR-1']);
    expect(calls).toHaveLength(1);
  });

  it('answers an empty list where nothing matches', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { issues: [] } } });

    await expect(listIssueKeys(request, JQL)).resolves.toStrictEqual([]);
  });

  it('refuses a work item it cannot read rather than dropping it from the walk', async () => {
    const { request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: [{ key: 'THOR-1' }, { id: '10001' }] } },
    });

    await expect(listIssueKeys(request, JQL)).rejects.toThrow('answered with work items this cannot read');
  });

  it('throws naming the query where the search is rejected', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { errorMessages: [] }, status: 400 } });

    await expect(listIssueKeys(request, JQL)).rejects.toMatchObject({ label: `search '${JQL}'`, status: 400 });
  });
});
