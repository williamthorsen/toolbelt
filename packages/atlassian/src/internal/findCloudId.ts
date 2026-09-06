import { JiraRequestError } from '../3-candidate/JiraRequestError.ts';
import { fetchOrRaise } from './fetchOrRaise.ts';

const SERVER_ERROR_STATUS = 500;
const TENANT_INFO_PATH = '/_edge/tenant_info';

/**
 * Reads a site's cloudId from its tenant-info endpoint, which answers without authentication, so no credential
 * reaches this request.
 *
 * @internal
 */
export async function findCloudId(host: string, fetchImpl: typeof globalThis.fetch): Promise<string> {
  const url = `https://${host}${TENANT_INFO_PATH}`;

  const response = await fetchOrRaise(url, fetchImpl, { headers: { Accept: 'application/json' } });
  // A gateway incident is retryable and a 4xx is not: below 500 the host is no Atlassian site, which is a
  // usage error fixed by correcting the site.
  if (response.status >= SERVER_ERROR_STATUS) {
    // `JiraResponse.text` carries a body only where there is one, which is what every other site gets from
    // `readResponse`; an empty string here would end the error's message at its colon.
    const body = await response.text();

    throw new JiraRequestError({
      label: `read the cloudId of '${host}'`,
      method: 'GET',
      path: TENANT_INFO_PATH,
      response: { json: undefined, status: response.status, text: body === '' ? undefined : body, url },
    });
  }
  if (!response.ok) {
    throw new Error(`Could not read the cloudId of '${host}'. ${url} answered ${response.status}.`);
  }

  const payload: unknown = await response.json();
  const cloudId = readCloudId(payload);
  if (cloudId === undefined) {
    throw new Error(`Could not read the cloudId of '${host}'. ${url} answered without a 'cloudId' field.`);
  }

  return cloudId;
}

// region | Helpers

/** Narrows a tenant-info payload to its cloudId. */
function readCloudId(payload: unknown): string | undefined {
  if (typeof payload !== 'object' || payload === null || !('cloudId' in payload)) return undefined;

  const { cloudId } = payload;

  return typeof cloudId === 'string' && cloudId !== '' ? cloudId : undefined;
}

// endregion | Helpers
