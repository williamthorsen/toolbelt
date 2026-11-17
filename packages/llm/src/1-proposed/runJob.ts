import { createModel } from '../internal/createModel.ts';
import { runJobOnModel } from '../internal/runJobOnModel.ts';
import type { Job, JobOutcome, ProviderConnection, RunJobOptions } from '../types/job.ts';

/**
 * Runs a job on a provider connection until the job has a result, the model stops calling tools, or the job
 * reaches `maxRounds`, reporting each event to `onEvent`. Rejects with the signal's reason when `signal` aborts, with
 * a `RangeError` when `maxRounds` is not a positive integer, and with `JobRunError` on any other failure.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export async function runJob<Result>(
  job: Job<Result>,
  connection: ProviderConnection,
  options: RunJobOptions = {},
): Promise<JobOutcome<Result>> {
  return runJobOnModel(job, createModel(connection), options);
}
