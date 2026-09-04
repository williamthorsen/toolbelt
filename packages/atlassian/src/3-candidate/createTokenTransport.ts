import { Buffer } from 'node:buffer';

/**
 * Builds a request function that authenticates over Basic auth with an email and an API token. The credential
 * arrives as a value: nothing here reads an environment variable, a file, or a keystore. Every status is
 * reported to the caller, a rejected one included, so only a transport failure throws.
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
    const response = await fetchImpl(`${origin}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers: {
        Accept: 'application/json',
        Authorization: authorization,
        ...(body !== undefined && { 'Content-Type': 'application/json' }),
      },
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });

    return readResponse(response);
  };
}

/** Issues one request against a resolved Jira base URL. */
export type JiraRequest = (method: string, path: string, body?: unknown) => Promise<JiraResponse>;

/** What one request answered with. */
export interface JiraResponse {
  /** The parsed body, or `undefined` where it was not JSON. */
  readonly json: unknown;
  readonly status: number;
  /** The raw body, carried only where it did not parse as JSON. */
  readonly text: string | undefined;
}

export interface TokenTransportOptions {
  /** The gateway base URL, such as `resolveJiraBaseUrl` returns. */
  readonly baseUrl: string;
  readonly email: string;
  readonly fetch?: typeof globalThis.fetch | undefined;
  readonly token: string;
}

// region | Helpers

/** Reads a response into the shape callers branch on, keeping a body that is not JSON as text. */
async function readResponse(response: Response): Promise<JiraResponse> {
  const text = await response.text();
  if (text === '') return { json: undefined, status: response.status, text: undefined };

  try {
    return { json: JSON.parse(text), status: response.status, text: undefined };
  } catch {
    return { json: undefined, status: response.status, text };
  }
}

// endregion | Helpers
