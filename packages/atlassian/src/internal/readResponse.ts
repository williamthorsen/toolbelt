import type { JiraResponse } from '../3-candidate/createTokenTransport.ts';

/**
 * Reads a response into the shape on which callers branch, keeping a body that is not JSON as text. The URL is
 * supplied by the caller: A `Response` built by its constructor has an empty `url`.
 *
 * @internal
 */
export async function readResponse(response: Response, url: string): Promise<JiraResponse> {
  const text = await response.text();
  if (text === '') return { json: undefined, status: response.status, text: undefined, url };

  try {
    return { json: JSON.parse(text), status: response.status, text: undefined, url };
  } catch {
    return { json: undefined, status: response.status, text, url };
  }
}
