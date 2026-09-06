import { Buffer } from 'node:buffer';

import { describe, expect, it, vi } from 'vitest';

import { createTokenTransport } from '../createTokenTransport.ts';

const BASE_URL = 'https://api.atlassian.com/ex/jira/abc-123';
const EMAIL = 'someone@example.com';
const TOKEN = 'a-token';

describe(createTokenTransport, () => {
  it('carries the Basic credential and resolves the path against the base URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await request('GET', '/rest/api/3/myself');

    const expected = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`, 'utf8').toString('base64')}`;
    expect(fetchImpl).toHaveBeenCalledWith(
      `${BASE_URL}/rest/api/3/myself`,
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expected }) }),
    );
  });

  it('encodes a credential carrying non-ASCII characters', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    const request = createTokenTransport({
      baseUrl: BASE_URL,
      email: 'zoë@example.com',
      fetch: fetchImpl,
      token: TOKEN,
    });

    await request('GET', '/rest/api/3/myself');

    const expected = `Basic ${Buffer.from(`zoë@example.com:${TOKEN}`, 'utf8').toString('base64')}`;
    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: expected }) }),
    );
  });

  it('drops a trailing slash from the base URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    const request = createTokenTransport({ baseUrl: `${BASE_URL}/`, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await request('GET', '/rest/api/3/myself');

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE_URL}/rest/api/3/myself`, expect.anything());
  });

  it('joins a path written without a leading slash', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await request('GET', 'rest/api/3/myself');

    expect(fetchImpl).toHaveBeenCalledWith(`${BASE_URL}/rest/api/3/myself`, expect.anything());
  });

  it('carries the URL it resolved, which the response object does not hold', async () => {
    // A `Response` built by its constructor carries an empty `url`, so a transport reading it would report ''.
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('GET', '/rest/api/3/myself')).resolves.toMatchObject({
      url: `${BASE_URL}/rest/api/3/myself`,
    });
  });

  it('sends a JSON body with its content type', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await request('POST', '/rest/api/3/workflows/update', { workflows: [] });

    expect(fetchImpl).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        body: '{"workflows":[]}',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        method: 'POST',
      }),
    );
  });

  it('sends no body or content type where none is given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await request('GET', '/rest/api/3/myself');

    // Asserting the whole init is what proves neither a body nor a content type is sent.
    const authorization = `Basic ${Buffer.from(`${EMAIL}:${TOKEN}`, 'utf8').toString('base64')}`;
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), {
      headers: { Accept: 'application/json', Authorization: authorization },
      method: 'GET',
    });
  });

  it('reports a parsed JSON body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ id: '10000' }));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('GET', '/rest/api/3/myself')).resolves.toStrictEqual({
      json: { id: '10000' },
      status: 200,
      text: undefined,
      url: `${BASE_URL}/rest/api/3/myself`,
    });
  });

  it('reports a body that is not JSON as text', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>gateway</html>', { status: 502 }));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('GET', '/rest/api/3/myself')).resolves.toStrictEqual({
      json: undefined,
      status: 502,
      text: '<html>gateway</html>',
      url: `${BASE_URL}/rest/api/3/myself`,
    });
  });

  it('reports an empty body', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('DELETE', '/rest/api/3/status/1')).resolves.toStrictEqual({
      json: undefined,
      status: 204,
      text: undefined,
      url: `${BASE_URL}/rest/api/3/status/1`,
    });
  });

  it('returns a rejected status rather than throwing', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ message: 'Unauthorized' }, { status: 401 }));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('GET', '/rest/api/3/myself')).resolves.toMatchObject({ status: 401 });
  });

  it('reports a transport failure as the URL that it could not reach, keeping the fault as the cause', async () => {
    const cause = new TypeError('fetch failed');
    const fetchImpl = vi.fn().mockRejectedValue(cause);
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('GET', '/rest/api/3/myself')).rejects.toMatchObject({
      cause,
      message: `Could not reach ${BASE_URL}/rest/api/3/myself`,
      name: 'JiraTransportError',
      url: `${BASE_URL}/rest/api/3/myself`,
    });
  });

  it('reports a rejected status through the response rather than as a transport failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({}, { status: 503 }));
    const request = createTokenTransport({ baseUrl: BASE_URL, email: EMAIL, fetch: fetchImpl, token: TOKEN });

    await expect(request('GET', '/rest/api/3/myself')).resolves.toMatchObject({ status: 503 });
  });
});
