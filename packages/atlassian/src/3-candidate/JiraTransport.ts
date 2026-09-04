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
