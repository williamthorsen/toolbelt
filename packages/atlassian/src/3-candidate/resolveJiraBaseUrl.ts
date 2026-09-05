import { findCloudId } from '../internal/findCloudId.ts';

const GATEWAY_ORIGIN = 'https://api.atlassian.com';

/**
 * Resolves the gateway base URL against which a scoped API token authenticates, reading the cloudId from the
 * site where the caller does not supply one. A site is accepted bare (`acme.atlassian.net`), with a scheme, or
 * as a URL copied from a browser, of which only the host is used. Requests against the site itself are not a
 * fallback that this offers: a scoped token sent there is ignored rather than rejected.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function resolveJiraBaseUrl(options: JiraBaseUrlOptions): Promise<string> {
  const { cloudId, fetch: fetchImpl = fetch, site } = options;

  const host = readHost(site);
  const resolvedCloudId = cloudId ?? (await findCloudId(host, fetchImpl));

  return `${GATEWAY_ORIGIN}/ex/jira/${resolvedCloudId}`;
}

export interface JiraBaseUrlOptions {
  /** Skips the tenant-info read when given, so a caller that already holds the cloudId makes no request. */
  readonly cloudId?: string | undefined;
  readonly fetch?: typeof globalThis.fetch | undefined;
  readonly site: string;
}

// region | Helpers

/** Reduces a site to the host that tenant-info is read from. */
function readHost(site: string): string {
  const trimmed = site.trim();
  if (trimmed === '') throw new Error('A site is required to resolve the base URL.');

  const host = URL.parse(trimmed.includes('://') ? trimmed : `https://${trimmed}`)?.host;
  if (host === undefined || host === '') {
    throw new Error(`'${site}' is not a site host, such as 'acme.atlassian.net'.`);
  }

  return host;
}

// endregion | Helpers
