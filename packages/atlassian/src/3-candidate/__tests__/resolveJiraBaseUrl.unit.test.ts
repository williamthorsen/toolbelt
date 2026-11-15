import { describe, expect, it, vi } from 'vitest';

import { JiraSettingError } from '../JiraSettingError.ts';
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

  it('throws when the site is blank', async () => {
    const resolving = resolveJiraBaseUrl({ cloudId: 'abc-123', site: ' '.repeat(3) });

    await expect(resolving).rejects.toThrow(JiraSettingError);
    await expect(resolving).rejects.toThrow('A site is required');
  });

  it('uses only the host of a URL copied from a browser', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ cloudId: 'derived-9' }));

    await resolveJiraBaseUrl({ fetch: fetchImpl, site: 'https://acme.atlassian.net/jira/software/projects/ABC' });

    expect(fetchImpl).toHaveBeenCalledWith('https://acme.atlassian.net/_edge/tenant_info', expect.anything());
  });

  it('drops a path from a bare site as it does from one with a scheme', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(Response.json({ cloudId: 'derived-9' }));

    await resolveJiraBaseUrl({ fetch: fetchImpl, site: 'acme.atlassian.net/jira' });

    expect(fetchImpl).toHaveBeenCalledWith('https://acme.atlassian.net/_edge/tenant_info', expect.anything());
  });

  it('throws on a site that names no host', async () => {
    const resolving = resolveJiraBaseUrl({ cloudId: 'abc-123', site: 'not a host' });

    await expect(resolving).rejects.toThrow(JiraSettingError);
    await expect(resolving).rejects.toThrow('is not a site host');
  });

  it('throws on a failed tenant-info read', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response('', { status: 404 }));

    const resolving = resolveJiraBaseUrl({ fetch: fetchImpl, site: 'acme.atlassian.net' });

    await expect(resolving).rejects.toThrow(JiraSettingError);
    await expect(resolving).rejects.toThrow('returned 404');
  });
});
