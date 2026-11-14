import { JiraRequestError } from '../3-candidate/JiraRequestError.ts';
import { JiraResponseError } from '../3-candidate/JiraResponseError.ts';
import { fetchOrRaise } from './fetchOrRaise.ts';
import { readFilledStringField } from './readFilledStringField.ts';
import { readResponse } from './readResponse.ts';

const SERVER_ERROR_STATUS = 500;
const TENANT_INFO_PATH = '/_edge/tenant_info';

/**
 * Reads a site's cloudId from its tenant-info endpoint, which responds without authentication, so this request
 * sends no credential.
 *
 * @internal
 */
export async function findCloudId(host: string, fetchImpl: typeof globalThis.fetch): Promise<string> {
  const url = `https://${host}${TENANT_INFO_PATH}`;

  const raw = await fetchOrRaise(url, fetchImpl, { headers: { Accept: 'application/json' } });
  const response = await readResponse(raw, url);
  // A gateway incident is retryable and a 4xx is not: Below 500 the host is no Atlassian site, which is a
  // usage error fixed by correcting the site.
  if (response.status >= SERVER_ERROR_STATUS) {
    throw new JiraRequestError({
      label: `read the cloudId of '${host}'`,
      method: 'GET',
      path: TENANT_INFO_PATH,
      response,
    });
  }
  if (!raw.ok) {
    throw new Error(`Could not read the cloudId of '${host}'. ${url} returned ${response.status}.`);
  }
  if (response.json === undefined) {
    throw new JiraResponseError({
      message: `Could not read the cloudId of '${host}': the tenant-info response is not JSON.`,
      url,
    });
  }

  const cloudId = readFilledStringField(response.json, 'cloudId');
  if (cloudId === undefined) {
    throw new JiraResponseError({
      message: `Could not read the cloudId of '${host}': the tenant-info response returned no 'cloudId' field.`,
      url,
    });
  }

  return cloudId;
}
