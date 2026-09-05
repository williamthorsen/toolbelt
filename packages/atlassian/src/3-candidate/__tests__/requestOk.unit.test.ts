import { describe, expect, it } from 'vitest';

import { createFakeRequest } from '../../test-utils/createFakeRequest.ts';
import { JiraRequestError } from '../JiraRequestError.ts';
import { requestOk } from '../requestOk.ts';

const PATH = '/rest/api/3/project/THOR';

describe(requestOk, () => {
  it('returns the response and issues the call that it was given', async () => {
    const { calls, request } = createFakeRequest({ [`POST ${PATH}`]: { json: { id: '10000' } } });

    const response = await requestOk(request, {
      body: { key: 'THOR' },
      label: 'read project',
      method: 'POST',
      path: PATH,
    });

    expect(response.json).toStrictEqual({ id: '10000' });
    expect(calls).toStrictEqual([{ body: { key: 'THOR' }, method: 'POST', path: PATH }]);
  });

  it('throws carrying the method, path, status, and parsed reply', async () => {
    const { request } = createFakeRequest({
      [`GET ${PATH}`]: { json: { errorMessages: ['No project could be found.'] }, status: 404 },
    });

    const rejected = requestOk(request, { label: 'read project THOR', method: 'GET', path: PATH });

    await expect(rejected).rejects.toBeInstanceOf(JiraRequestError);
    await expect(rejected).rejects.toMatchObject({
      body: { errorMessages: ['No project could be found.'] },
      message: 'read project THOR failed (HTTP 404): {"errorMessages":["No project could be found."]}',
      method: 'GET',
      path: PATH,
      status: 404,
    });
  });

  it('carries a reply that did not parse as JSON through as text', async () => {
    const { request } = createFakeRequest({
      [`GET ${PATH}`]: { status: 503, text: '<html>Service Unavailable</html>' },
    });

    await expect(requestOk(request, { label: 'read project', method: 'GET', path: PATH })).rejects.toMatchObject({
      body: '<html>Service Unavailable</html>',
      message: 'read project failed (HTTP 503): <html>Service Unavailable</html>',
    });
  });

  it('reports an empty reply rather than the word undefined', async () => {
    const { request } = createFakeRequest({ [`GET ${PATH}`]: { status: 500 } });

    await expect(requestOk(request, { label: 'read project', method: 'GET', path: PATH })).rejects.toMatchObject({
      message: 'read project failed (HTTP 500): no body',
    });
  });

  it('returns a 204 rather than treating an empty success as a failure', async () => {
    const { request } = createFakeRequest({ [`PUT ${PATH}`]: { status: 204 } });

    await expect(requestOk(request, { label: 'write', method: 'PUT', path: PATH })).resolves.toMatchObject({
      status: 204,
    });
  });
});

describe(createFakeRequest, () => {
  it('answers a sequence route once per call and matches a path carrying a query string', async () => {
    const { request } = createFakeRequest({
      'GET /search': { sequence: [{ json: { page: 1 } }, { json: { page: 2 } }] },
    });

    await expect(request('GET', '/search?token=a')).resolves.toMatchObject({ json: { page: 1 } });
    await expect(request('GET', '/search?token=b')).resolves.toMatchObject({ json: { page: 2 } });
  });

  it('throws naming an unmatched route rather than answering a 404', () => {
    const { request } = createFakeRequest({ 'GET /search': { json: {} } });

    expect(() => request('POST', '/other')).toThrow("No fake route for 'POST /other'");
  });
});
