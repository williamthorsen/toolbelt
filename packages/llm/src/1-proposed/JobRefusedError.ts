import type { JobRefusalReason } from '../types/endpoint.ts';

/**
 * The error that `runJob` rejects with when an endpoint refuses a job before running it. `limit` names the counter's
 * limit when `reason` is `limit-reached`. `details` holds what the endpoint's reservation attached to its refusal,
 * as the endpoint sent it and unvalidated.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export class JobRefusedError extends Error {
  override readonly name = 'JobRefusedError';
  readonly status: number;
  readonly reason: JobRefusalReason;
  declare readonly limit?: string;
  declare readonly details?: unknown;

  constructor(options: {
    readonly status: number;
    readonly reason: JobRefusalReason;
    readonly message: string;
    readonly limit?: string | undefined;
    readonly details?: unknown;
  }) {
    super(options.message);
    this.status = options.status;
    this.reason = options.reason;
    if (options.limit !== undefined) this.limit = options.limit;
    if (options.details !== undefined) this.details = options.details;
  }
}
