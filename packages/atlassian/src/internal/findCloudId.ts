const TENANT_INFO_PATH = '/_edge/tenant_info';

/**
 * Reads a site's cloudId from its tenant-info endpoint, which answers without authentication, so no credential
 * reaches this request.
 *
 * @internal
 */
export async function findCloudId(host: string, fetchImpl: typeof globalThis.fetch): Promise<string> {
  const url = `https://${host}${TENANT_INFO_PATH}`;

  const response = await fetchImpl(url, { headers: { Accept: 'application/json' } });
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
