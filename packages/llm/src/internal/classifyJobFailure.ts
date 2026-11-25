import { APICallError, RetryError } from 'ai';

import type { JobFailureReason } from '../types/job.ts';
import { isRefusedCredential } from './isRefusedCredential.ts';

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
  if (isRefusedCredential(error.statusCode, error.responseBody))
    return { reason: 'credential-refused', providerMessage: error.message };
  return { reason: 'failed' };
}
