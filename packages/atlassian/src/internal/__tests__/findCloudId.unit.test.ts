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

    // Asserting the whole init is what proves no Authorization header is sent.
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

  it('throws when the endpoint does not answer OK', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toThrow('answered 404');
  });

  it('raises a request error for a gateway incident, which a caller retries rather than corrects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('upstream down', { status: 503 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toMatchObject({
      name: 'JiraRequestError',
      status: 503,
    });
  });

  it('leaves a 4xx as a plain error, which names the site the caller corrects', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.not.toMatchObject({
      name: 'JiraRequestError',
    });
  });

  it('throws when the payload carries no cloudId', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ tenant: 'acme' }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toThrow("without a 'cloudId' field");
  });

  it('throws when the cloudId is empty', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ cloudId: '' }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toThrow("without a 'cloudId' field");
  });
});

// region | Helpers

function jsonResponse(payload: unknown): Response {
  return Response.json(payload, { headers: { 'Content-Type': 'application/json' } });
}

// endregion | Helpers
