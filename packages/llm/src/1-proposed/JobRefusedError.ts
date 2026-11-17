import type { JobRefusalReason } from '../types/endpoint.ts';

/**
 * The error that `runJob` rejects with when an endpoint refuses a job before running it. `limit` names the counter's
 * limit when `reason` is `limit-reached`.
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

  constructor(options: {
    readonly status: number;
    readonly reason: JobRefusalReason;
    readonly message: string;
    readonly limit?: string | undefined;
  }) {
    super(options.message);
    this.status = options.status;
    this.reason = options.reason;
    if (options.limit !== undefined) this.limit = options.limit;
  }
}
