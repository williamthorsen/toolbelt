import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { JiraResponseError } from '../JiraResponseError.ts';
import { listIssueKeys } from '../listIssueKeys.ts';

const SEARCH_PATH = 'POST /rest/api/3/search/jql';
const JQL = 'project = "PROJ" AND status = "To Do"';

describe(listIssueKeys, () => {
  it('returns the key of each work item across pages, requesting only the key field', async () => {
    const { calls, request } = createFakeRequest({
      [SEARCH_PATH]: {
        sequence: [
          { json: { issues: [{ key: 'PROJ-1' }, { key: 'PROJ-2' }], nextPageToken: 'page-2' } },
          { json: { issues: [{ key: 'PROJ-3' }] } },
        ],
      },
    });

    await expect(listIssueKeys(request, JQL)).resolves.toStrictEqual(['PROJ-1', 'PROJ-2', 'PROJ-3']);
    expect(calls[0]?.body).toStrictEqual({ fields: ['key'], jql: JQL, maxResults: 100 });
  });

  it('refuses a work item that it cannot read rather than dropping it from the walk', async () => {
    const { request } = createFakeRequest({
      [SEARCH_PATH]: { json: { issues: [{ key: 'PROJ-1' }, { id: '10001' }] } },
    });

    const reading = listIssueKeys(request, JQL);

    await expect(reading).rejects.toThrow('returned work items that this cannot read');
    await expect(reading).rejects.toBeInstanceOf(JiraResponseError);
  });

  it('throws naming the query when the search is rejected', async () => {
    const { request } = createFakeRequest({ [SEARCH_PATH]: { json: { errorMessages: [] }, status: 400 } });

    await expect(listIssueKeys(request, JQL)).rejects.toMatchObject({ label: `search '${JQL}'`, status: 400 });
  });
});
