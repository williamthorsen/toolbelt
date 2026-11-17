import { describeError } from '@williamthorsen/toolbelt.errors';

/**
 * The error that `runJob` rejects with when a job fails for any reason but an abort: The provider refused or broke
 * off a request, a tool threw, or `onEvent` threw. `cause` holds the underlying error, such as the AI SDK's
 * `APICallError`, whose `statusCode` is the provider's HTTP status.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export class JobRunError extends Error {
  override readonly name = 'JobRunError';

  constructor(options: { readonly cause: unknown }) {
    super(`The job failed: ${describeError(options.cause)}`, options);
  }
}
