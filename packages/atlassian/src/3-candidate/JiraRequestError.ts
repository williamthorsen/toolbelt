import { isRecord } from '../internal/isRecord.ts';
import type { JiraResponse } from './createTokenTransport.ts';

const FORBIDDEN = 403;
const NOT_FOUND = 404;
const REMEDIES: Record<JiraRejectionReason, string> = {
  credential: 'The email and token did not authenticate.',
  'not-found':
    'Either the resource does not exist, or no credential reached the gateway and the request ran anonymously.',
  permission: 'The credential authenticated, and the acting user lacks a Jira permission required by this call.',
  scope:
    "The token lacks a scope required by this endpoint. A token's scopes are fixed at creation, so a replacement token carrying the full grant resolves it.",
};
const SCOPE_MISMATCH_MESSAGE = 'scope does not match';
const UNAUTHORIZED = 401;

/**
 * A request answered by Jira with a status outside 2xx. The status, the URL, and the classification are carried as
 * fields so a caller branches on them rather than parsing the message, and the message states the classification as
 * well, so a command line printing only the message still reports it.
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
  /** Which failure the status and body report, or `undefined` where they match none. */
  readonly reason: JiraRejectionReason | undefined;
  readonly status: number;
  /** The URL to which the request was sent, origin included. */
  readonly url: string;

  constructor(options: JiraRequestErrorOptions) {
    const { label, method, path, response } = options;
    const { json, status, text, url } = response;

    const body = text ?? json;
    const reason = findRejectionReason(status, body);
    const reported = text ?? (json === undefined ? 'no body' : JSON.stringify(json));
    const remedy = reason === undefined ? '' : ` ${REMEDIES[reason]}`;

    super(`${label} failed (HTTP ${status} at ${url}): ${reported}${remedy}`);

    this.body = body;
    this.label = label;
    this.method = method;
    this.name = 'JiraRequestError';
    this.path = path;
    this.reason = reason;
    this.status = status;
    this.url = url;
  }
}

/** The failure that a rejected request reports, as its status and body identify it. */
export type JiraRejectionReason = 'credential' | 'not-found' | 'permission' | 'scope';

export interface JiraRequestErrorOptions {
  /** What the call was doing, in the imperative, such as `read project THOR`. */
  readonly label: string;
  readonly method: string;
  readonly path: string;
  readonly response: JiraResponse;
}

// region | Helpers

/**
 * Classifies a rejection from its status and body, returning `undefined` where the two name no failure that a
 * caller can act on. The gateway rejects a token missing a scope with a 401 of its own, ahead of anything Jira
 * validates, so a scope shortfall and a bad credential are told apart by the message alone.
 */
function findRejectionReason(status: number, body: unknown): JiraRejectionReason | undefined {
  if (status === UNAUTHORIZED) return namesScopeMismatch(body) ? 'scope' : 'credential';
  if (status === FORBIDDEN) return 'permission';
  if (status === NOT_FOUND) return 'not-found';

  return undefined;
}

/** Reports whether a body contains the gateway's message for a token missing a scope. */
function namesScopeMismatch(body: unknown): boolean {
  if (!isRecord(body)) return false;

  const { message } = body;

  return typeof message === 'string' && message.toLowerCase().includes(SCOPE_MISMATCH_MESSAGE);
}

// endregion | Helpers
