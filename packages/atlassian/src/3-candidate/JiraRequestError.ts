import type { JiraResponse } from './createTokenTransport.ts';

/**
 * A request Jira answered with a status outside 2xx. The status is carried as a field so a caller branches on it
 * rather than parsing the message.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class JiraRequestError extends Error {
  /** The parsed body, or the raw text where it did not parse as JSON. */
  readonly body: unknown;
  /** What the call was doing, as the message reports it. */
  readonly label: string;
  readonly method: string;
  readonly path: string;
  readonly status: number;

  constructor(options: JiraRequestErrorOptions) {
    const { label, method, path, response } = options;
    const { json, status, text } = response;

    super(`${label} failed (HTTP ${status}): ${text ?? (json === undefined ? 'no body' : JSON.stringify(json))}`);

    this.body = text ?? json;
    this.label = label;
    this.method = method;
    this.name = 'JiraRequestError';
    this.path = path;
    this.status = status;
  }
}

export interface JiraRequestErrorOptions {
  /** What the call was doing, in the imperative, such as `read project THOR`. */
  readonly label: string;
  readonly method: string;
  readonly path: string;
  readonly response: JiraResponse;
}
