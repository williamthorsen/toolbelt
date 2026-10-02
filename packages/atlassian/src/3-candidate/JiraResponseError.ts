/**
 * A response that Jira returned with a 2xx status and that does not have the shape that its reader reads. The URL is
 * declared as a field so that a caller branches on it rather than parsing the message, and the message states it as
 * well, so that a command line printing only the message still names the endpoint whose response changed.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class JiraResponseError extends Error {
  /** The URL that returned the response, origin included. */
  readonly url: string;

  constructor(options: JiraResponseErrorOptions) {
    const { message, url } = options;

    super(`${message} The response came from ${url}.`);

    this.name = 'JiraResponseError';
    this.url = url;
  }
}

export interface JiraResponseErrorOptions {
  /** What the reader could not read, as one complete sentence. */
  readonly message: string;
  readonly url: string;
}
