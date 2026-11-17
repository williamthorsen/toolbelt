import { createModel } from '../internal/createModel.ts';
import { runJobAtEndpoint } from '../internal/runJobAtEndpoint.ts';
import { runJobOnModel } from '../internal/runJobOnModel.ts';
import type { EndpointConnection } from '../types/endpoint.ts';
import type { Job, JobOutcome, ProviderConnection, RunJobOptions } from '../types/job.ts';

/**
 * Runs a job on a provider connection until the job has a result, the model stops calling tools, or the job
 * reaches `maxRounds`, reporting each event to `onEvent`. Rejects with the signal's reason when `signal` aborts, with
 * a `RangeError` when `maxRounds` is not a positive integer, and with `JobRunError` on any other failure.
 *
 * On an `EndpointConnection`, it posts the job's input to the operator's endpoint, which runs its own job and caps,
 * and it reports the events and outcome that the endpoint streams. It then rejects with `JobRefusedError` when the
 * endpoint refuses the job, and does not check `maxRounds`.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export async function runJob<Result>(
  job: Job<Result>,
  connection: EndpointConnection | ProviderConnection,
  options: RunJobOptions = {},
): Promise<JobOutcome<Result>> {
  if ('url' in connection) return runJobAtEndpoint(job, connection, options);
  return runJobOnModel(job, createModel(connection), options);
}
