import { describe, expect, it, vi } from 'vitest';

import { findCloudId } from '../findCloudId.ts';

describe(findCloudId, () => {
  it('reads the cloudId from the tenant-info endpoint', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ cloudId: 'abc-123' }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).resolves.toBe('abc-123');
    expect(fetchImpl).toHaveBeenCalledWith('https://acme.atlassian.net/_edge/tenant_info', expect.anything());
  });

  it('sends no credential', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ cloudId: 'abc-123' }));

    await findCloudId('acme.atlassian.net', fetchImpl);

    // Asserting the whole init proves no Authorization header is sent.
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), { headers: { Accept: 'application/json' } });
  });

  it('reports a transport failure as the tenant-info URL that it could not reach', async () => {
    const cause = new TypeError('fetch failed');
    const fetchImpl = vi.fn().mockRejectedValue(cause);

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      cause,
      name: 'JiraTransportError',
      url: 'https://acme.atlassian.net/_edge/tenant_info',
    });
  });

  it('throws when the endpoint does not return OK', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toThrow('returned 404');
  });

  it('raises a request error for a gateway incident, which a caller retries rather than corrects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('upstream down', { status: 503 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      name: 'JiraRequestError',
      status: 503,
    });
  });

  it('names the absent body of a gateway incident rather than ending the message at the colon', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 503 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toThrow(
      "read the cloudId of 'acme.atlassian.net' failed (HTTP 503 at https://acme.atlassian.net/_edge/tenant_info): no body",
    );
  });

  it('leaves a 4xx as a plain error, which names the site that the caller corrects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.not.toMatchObject({
      name: 'JiraRequestError',
    });
  });

  it('reports the parsed body of a gateway incident that answers in JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ message: 'upstream down' }, 503));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      body: { message: 'upstream down' },
      name: 'JiraRequestError',
    });
  });

  it('raises a response error naming the host and URL when the body is not JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('<html>maintenance</html>', { status: 200 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      message: expect.stringContaining("'acme.atlassian.net': the tenant-info response is not JSON"),
      name: 'JiraResponseError',
      url: 'https://acme.atlassian.net/_edge/tenant_info',
    });
  });

  it('raises a response error when the payload contains no cloudId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ tenant: 'acme' }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      message: expect.stringContaining("has no 'cloudId' field"),
      name: 'JiraResponseError',
      url: 'https://acme.atlassian.net/_edge/tenant_info',
    });
  });

  it('raises a response error when the cloudId is empty', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ cloudId: '' }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      message: expect.stringContaining("has no 'cloudId' field"),
      name: 'JiraResponseError',
    });
  });
});

// region | Helpers

/** Builds a JSON response over a payload. */
function jsonResponse(payload: unknown, status = 200): Response {
  return Response.json(payload, { headers: { 'Content-Type': 'application/json' }, status });
}

// endregion | Helpers
