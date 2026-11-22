import { assertPositiveInteger } from '../internal/assertPositiveInteger.ts';
import { createModel } from '../internal/createModel.ts';
import { handleJobRequest } from '../internal/handleJobRequest.ts';
import type { JobHandlerOptions } from '../types/endpoint.ts';

/**
 * Creates a fetch handler that runs the job built from each request's input on the operator's provider connection,
 * and streams the job's events and outcome to `runJob` on an `EndpointConnection`. It refuses a request before any
 * model request with a JSON body naming the reason: 405 for a method other than `POST`, 400 for a body that is not a
 * JSON object with a string `input`, 413 for an input over `maxInputLength`, 403 when `checkBot` refuses, 429 when
 * `countJob` or `reserveJob` refuses, and 503 when `checkBot`, `countJob`, or `reserveJob` throws. It caps a reserved
 * job's output at the reservation's `maxOutputTokens` and settles the reservation once the job ends. A failure after
 * streaming starts reaches the page as a generic failure, and its error goes to `onError`. The handler adds no CORS
 * headers. Throws a `RangeError` when `maxInputLength` or `maxRounds` is not a positive integer.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export function createJobHandler<Result>(options: JobHandlerOptions<Result>): (request: Request) => Promise<Response> {
  assertPositiveInteger(options.maxInputLength, 'maxInputLength');
  if (options.maxRounds !== undefined) assertPositiveInteger(options.maxRounds, 'maxRounds');
  const model = createModel(options.connection);
  return (request) => handleJobRequest(request, options, model);
}
