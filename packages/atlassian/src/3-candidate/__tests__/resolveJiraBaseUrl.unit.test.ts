import { describe, expect, it, vi } from 'vitest';

import { resolveJiraBaseUrl } from '../resolveJiraBaseUrl.ts';

describe(resolveJiraBaseUrl, () => {
  it('composes the gateway URL from a supplied cloudId without making a request', async () => {
    const fetchImpl = vi.fn();

    await expect(
      resolveJiraBaseUrl({ cloudId: 'abc-123', fetch: fetchImpl, site: 'acme.atlassian.net' }),
    ).resolves.toBe('https://api.atlassian.com/ex/jira/abc-123');
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('derives the cloudId from the site when none is given', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ cloudId: 'derived-9' }));

    await expect(resolveJiraBaseUrl({ fetch: fetchImpl, site: 'acme.atlassian.net' })).resolves.toBe(
      'https://api.atlassian.com/ex/jira/derived-9',
    );
  });

  it('accepts a site written with a scheme', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ cloudId: 'derived-9' }));

    await resolveJiraBaseUrl({ fetch: fetchImpl, site: 'https://acme.atlassian.net/' });

    expect(fetchImpl).toHaveBeenCalledWith('https://acme.atlassian.net/_edge/tenant_info', expect.anything());
  });

  it('throws on a site that names no host', async () => {
    await expect(resolveJiraBaseUrl({ cloudId: 'abc-123', site: ' '.repeat(3) })).rejects.toThrow('A site is required');
  });

  it('throws on a site that carries a path', async () => {
    await expect(resolveJiraBaseUrl({ cloudId: 'abc-123', site: 'acme.atlassian.net/browse' })).rejects.toThrow(
      'is not a site host',
    );
  });

  it('surfaces a failed tenant-info read', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 500 }));

    await expect(resolveJiraBaseUrl({ fetch: fetchImpl, site: 'acme.atlassian.net' })).rejects.toThrow('answered 500');
  });
});
