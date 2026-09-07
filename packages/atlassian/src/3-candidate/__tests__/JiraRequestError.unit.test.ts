import { describe, expect, it } from 'vitest';

import type { JiraResponse } from '../createTokenTransport.ts';
import { JiraRequestError } from '../JiraRequestError.ts';

const PATH = '/rest/api/3/project/THOR';
const REQUEST_URL = `https://api.atlassian.com/ex/jira/cloud-1${PATH}`;

describe(JiraRequestError, () => {
  it('has the status, the URL, and the body', () => {
    const error = buildError({ json: { errorMessages: ['nope'] }, status: 400 });

    expect(error).toMatchObject({
      body: { errorMessages: ['nope'] },
      method: 'GET',
      path: PATH,
      status: 400,
      url: REQUEST_URL,
    });
  });

  it('reads a scope shortfall out of the gateway 401, stating the remedy in the message', () => {
    const error = buildError({ json: { code: 401, message: 'Unauthorized; scope does not match' }, status: 401 });

    expect(error.reason).toBe('scope');
    expect(error.message).toBe(
      `read project THOR failed (HTTP 401 at ${REQUEST_URL}): {"code":401,"message":"Unauthorized; scope does not match"}` +
        " The token lacks a scope required by this endpoint. A token's scopes are fixed at creation, so a replacement" +
        ' token with the full grant resolves it.',
    );
  });

  it('reads a 401 naming no scope as a rejected credential', () => {
    const error = buildError({ json: { code: 401, message: 'Unauthorized' }, status: 401 });

    expect(error.reason).toBe('credential');
    expect(error.message).toContain('The email and token did not authenticate.');
  });

  it('reads a 401 whose body is not JSON as a rejected credential', () => {
    const error = buildError({ status: 401, text: '<html>Unauthorized</html>' });

    expect(error.reason).toBe('credential');
  });

  it('matches the gateway message whatever its case', () => {
    const error = buildError({ json: { message: 'Unauthorized; Scope Does Not Match' }, status: 401 });

    expect(error.reason).toBe('scope');
  });

  it('reads a 403 as a permission that the acting user lacks', () => {
    const error = buildError({ json: { errorMessages: ['forbidden'] }, status: 403 });

    expect(error.reason).toBe('permission');
    expect(error.message).toContain('lacks a Jira permission required by this call');
  });

  it('reads a 404 as either an absent resource or a request that ran anonymously', () => {
    const error = buildError({ json: { errorMessages: ['No project could be found.'] }, status: 404 });

    expect(error.reason).toBe('not-found');
    expect(error.message).toContain('Either the resource does not exist, or no credential reached the gateway');
  });

  it('leaves a server error unclassified and appends no remedy', () => {
    const error = buildError({ status: 503, text: 'Service Unavailable' });

    expect(error.reason).toBeUndefined();
    expect(error.message).toBe(`read project THOR failed (HTTP 503 at ${REQUEST_URL}): Service Unavailable`);
  });
});

// region | Helpers

/** Builds an error over a response, defaulting every field that the test does not set. */
function buildError(response: Partial<JiraResponse>): JiraRequestError {
  return new JiraRequestError({
    label: 'read project THOR',
    method: 'GET',
    path: PATH,
    response: { json: undefined, status: 500, text: undefined, url: REQUEST_URL, ...response },
  });
}

// endregion | Helpers
