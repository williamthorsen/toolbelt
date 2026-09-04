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

    // Asserting the whole init is what proves no Authorization header rides along.
    expect(fetchImpl).toHaveBeenCalledWith(expect.any(String), { headers: { Accept: 'application/json' } });
  });

  it('throws when the endpoint does not answer OK', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    await expect(findCloudId('acme.atlassian.net', fetchImpl)).rejects.toThrow('answered 404');
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
