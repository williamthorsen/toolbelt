import { Buffer } from 'node:buffer';

import { fetchOrRaise } from '../internal/fetchOrRaise.ts';

/**
 * Builds a request function that authenticates over Basic auth with an email and an API token. The credential
 * arrives as a value: nothing here reads an environment variable, a file, or a keystore. Every status is
 * reported to the caller, a rejected one included, so only a transport failure throws, as a
 * `JiraTransportError` naming the URL.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function createTokenTransport(options: TokenTransportOptions): JiraRequest {
  const { baseUrl, email, fetch: fetchImpl = fetch, token } = options;

  const authorization = `Basic ${Buffer.from(`${email}:${token}`, 'utf8').toString('base64')}`;
  const origin = baseUrl.replace(/\/+$/, '');

  return async function request(method: string, path: string, body?: unknown): Promise<JiraResponse> {
    const url = `${origin}${path.startsWith('/') ? path : `/${path}`}`;

    const response = await fetchOrRaise(url, fetchImpl, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    return readResponse(response, url);
  };
}

/** Issues one request against a resolved Jira base URL. */
export type JiraRequest = (method: string, path: string, body?: unknown) => Promise<JiraResponse>;

/** What one request returned. */
export interface JiraResponse {
  /** The parsed body, or `undefined` where it was not JSON. */
  readonly json: unknown;
  readonly status: number;
  /** The raw body, carried only where it did not parse as JSON. */
  readonly text: string | undefined;
  /** The URL the request was aimed at, origin included. */
  readonly url: string;
}

export interface TokenTransportOptions {
  /** The gateway base URL, such as `resolveJiraBaseUrl` returns. */
  readonly baseUrl: string;
  readonly email: string;
  readonly fetch?: typeof globalThis.fetch | undefined;
  readonly token: string;
}

// region | Helpers

/**
 * Reads a response into the shape on which callers branch, keeping a body that is not JSON as text. The URL is
 * supplied by the caller: A `Response` built by its constructor carries an empty `url`.
 */
async function readResponse(response: Response, url: string): Promise<JiraResponse> {
  const text = await response.text();
  if (text === '') return { json: undefined, status: response.status, text: undefined, url };

  try {
    return { json: JSON.parse(text), status: response.status, text: undefined, url };
  } catch {
    return { json: undefined, status: response.status, text, url };
  }
}

// endregion | Helpers
