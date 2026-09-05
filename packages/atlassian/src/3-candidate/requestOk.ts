import type { JiraRequest, JiraResponse } from './createTokenTransport.ts';
import { JiraRequestError } from './JiraRequestError.ts';

/**
 * Issues one request and returns its response, throwing where the status falls outside 2xx. Every call made by
 * this package goes through here, so the method and path reach the error without a call site restating them.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export async function requestOk(request: JiraRequest, options: RequestOkOptions): Promise<JiraResponse> {
  const { body, label, method, path } = options;

  const response = await request(method, path, body);
  if (response.status < 200 || response.status >= 300) {
    throw new JiraRequestError({ label, method, path, response });
  }

  return response;
}

export interface RequestOkOptions {
  readonly body?: unknown;
  /** What the call is doing, in the imperative, such as `read project THOR`. */
  readonly label: string;
  readonly method: string;
  readonly path: string;
}
