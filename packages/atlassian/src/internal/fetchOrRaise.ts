import { JiraTransportError } from '../3-candidate/JiraTransportError.ts';

/**
 * Issues one fetch, reporting a transport failure as the URL that could not be reached. A response is returned
 * whatever its status, so only a request that never arrived throws.
 *
 * @internal
 */
export async function fetchOrRaise(
  url: string,
  fetchImpl: typeof globalThis.fetch,
  init: RequestInit,
): Promise<Response> {
  try {
    return await fetchImpl(url, init);
  } catch (error) {
    throw new JiraTransportError({ cause: error, url });
  }
}
