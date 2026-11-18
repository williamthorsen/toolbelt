import { APICallError, RetryError } from 'ai';

import type { JobFailureReason } from '../types/job.ts';

/**
 * Classifies a job's failure from the AI SDK's error, reading through its retries to the last attempt's error.
 *
 * @internal
 */
export function classifyJobFailure(cause: unknown): { reason: JobFailureReason; providerMessage?: string } {
  const error = RetryError.isInstance(cause) ? cause.lastError : cause;
  if (!APICallError.isInstance(error)) return { reason: 'failed' };
  // The AI SDK reports a `fetch` that threw, which is all that a page sees of a blocked request, without a status.
  if (error.statusCode === undefined) return { reason: 'unreachable' };
  if (isRefusedCredential(error)) return { reason: 'credential-refused', providerMessage: error.message };
  return { reason: 'failed' };
}

// region | Helpers
/** Checks for a refused key: a 401 or 403, or Gemini's 400 that names an invalid key. */
function isRefusedCredential({ statusCode, responseBody }: APICallError): boolean {
  if (statusCode === 401 || statusCode === 403) return true;
  return statusCode === 400 && responseBody?.includes('API_KEY_INVALID') === true;
}
// endregion | Helpers
