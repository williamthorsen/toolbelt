import { describeError } from '@williamthorsen/toolbelt.errors';

import { classifyJobFailure } from '../internal/classifyJobFailure.ts';
import type { JobFailureReason } from '../types/job.ts';

/**
 * The error that `runJob` rejects with when a job fails for any reason but an abort or a refusal: The provider
 * refused or broke off a request, a tool threw, or `onEvent` threw. `cause` holds the underlying error, such as the AI
 * SDK's `APICallError`, whose `statusCode` is the provider's HTTP status. On an `EndpointConnection`, the endpoint
 * withholds the underlying error, and `cause` holds an `Error` that states what the page observed: the endpoint's
 * failure, an error status, or a stream that ended before the outcome.
 *
 * `reason` tells an app what to report:
 * - `credential-refused`: The provider refused the key as wrong, revoked, or lacking access: a 401 or 403, or
 *   Gemini's 400 for an invalid key. `providerMessage` holds the provider's own message.
 * - `unreachable`: No response arrived, because the network failed or the browser blocked the request, as it does
 *   for a provider that refuses calls from a page. The browser does not expose which.
 * - `failed`: Any other failure, an endpoint's error status included, since the endpoint's key is the operator's.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export class JobRunError extends Error {
  override readonly name = 'JobRunError';
  readonly reason: JobFailureReason;
  readonly providerMessage: string | undefined;

  constructor(options: { readonly cause: unknown; readonly reason?: JobFailureReason }) {
    super(`The job failed: ${describeError(options.cause)}`, options);
    const classified = classifyJobFailure(options.cause);
    this.reason = options.reason ?? classified.reason;
    this.providerMessage = this.reason === 'credential-refused' ? classified.providerMessage : undefined;
  }
}
