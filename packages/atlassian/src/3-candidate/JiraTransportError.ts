/**
 * A request that never reached Jira, the transport having failed before any response arrived. The URL is
 * carried as a field so a caller branches on it rather than parsing the message, and what the runtime reported
 * is the `cause`: node's `fetch` says only `fetch failed`, a DNS miss names the host, and a refused connection
 * names an address, so none of the three alone says which call was in flight.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class JiraTransportError extends Error {
  /** The URL at which the request was aimed. */
  readonly url: string;

  constructor(options: JiraTransportErrorOptions) {
    const { cause, url } = options;

    super(`Could not reach ${url}`, { cause });

    this.name = 'JiraTransportError';
    this.url = url;
  }
}

export interface JiraTransportErrorOptions {
  /** What the runtime threw, which names the fault that the URL cannot. */
  readonly cause: unknown;
  readonly url: string;
}
