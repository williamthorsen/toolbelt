import { describe, expect, it } from 'vitest';

import { JiraResponseError } from '../JiraResponseError.ts';

const REQUEST_URL = 'https://api.atlassian.com/ex/jira/cloud-1/rest/api/3/search/jql';

describe(JiraResponseError, () => {
  it('has the URL and its own name', () => {
    const error = new JiraResponseError({ message: 'Search returned no work items.', url: REQUEST_URL });

    expect(error).toMatchObject({ name: 'JiraResponseError', url: REQUEST_URL });
  });

  it('states the URL after the message', () => {
    const error = new JiraResponseError({ message: 'Search returned no work items.', url: REQUEST_URL });

    expect(error.message).toBe(`Search returned no work items. The response came from ${REQUEST_URL}.`);
  });
});
