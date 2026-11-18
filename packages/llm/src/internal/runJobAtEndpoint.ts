import { JobRefusedError } from '../1-proposed/JobRefusedError.ts';
import { JobRunError } from '../1-proposed/JobRunError.ts';
import type { EndpointConnection } from '../types/endpoint.ts';
import type { Job, JobEvent, JobOutcome, RunJobOptions } from '../types/job.ts';
import { type JobRefusalBody, parseJobStream, REFUSAL_STATUSES } from './jobStream.ts';

const JOB_EVENT_TYPES = new Set(['round-finished', 'text-delta', 'tool-call', 'tool-error', 'tool-result']);
const REFUSAL_STATUS_SET = new Set(Object.values(REFUSAL_STATUSES));

/**
 * Runs a job at an operator's endpoint: posts the job's input, reports each event that the endpoint streams, and
 * returns the endpoint's outcome. Rejects as `runJobOnModel` does, and with `JobRefusedError` when the endpoint
 * refuses the job.
 *
 * @internal
 */
export async function runJobAtEndpoint<Result>(
  job: Job<Result>,
  connection: EndpointConnection,
  { signal, onEvent }: RunJobOptions = {},
  fetch: typeof globalThis.fetch = globalThis.fetch,
): Promise<JobOutcome<Result>> {
  signal?.throwIfAborted();

  // Ends the request, and with it the job at the endpoint, when the run fails here.
  const controller = new AbortController();
  try {
    const response = await requestJob(fetch, connection.url, {
      method: 'POST',
      headers: { accept: 'text/event-stream', 'content-type': 'application/json', ...connection.headers },
      body: JSON.stringify({ input: job.input }),
      signal: signal === undefined ? controller.signal : AbortSignal.any([signal, controller.signal]),
    });
    if (!response.ok) throw await readRefusal(response);
    if (response.body !== null) {
      for await (const { name, data } of parseJobStream(response.body)) {
        signal?.throwIfAborted();
        if (name === 'failure') throw new Error(readFailureMessage(data));
        if (name === 'outcome') {
          if (isJobOutcome<Result>(data)) return data;
          throw new Error('The endpoint streamed an outcome of an unknown status.');
        }
        if (name !== 'job-event') continue;
        if (!isJobEvent(data)) throw new Error('The endpoint streamed an event of an unknown type.');
        onEvent?.(data);
      }
    }
    throw new Error('The endpoint closed the stream before the job finished.');
  } catch (error) {
    controller.abort();
    if (signal?.aborted === true) throw signal.reason;
    if (error instanceof JobRefusedError || error instanceof JobRunError) throw error;
    throw new JobRunError({ cause: error });
  }
}

// region | Helpers
/** Reports whether a value is an event that the endpoint relayed from `runJobOnModel`, judged by its `type`. */
function isJobEvent(value: unknown): value is JobEvent {
  const type = readStringField(value, 'type');
  return type !== undefined && JOB_EVENT_TYPES.has(type);
}

/**
 * Reports whether a value is an outcome, judged by its `status`. Its `result` is taken to have the page's `Result`
 * type, because the endpoint runs a job of the same definition as the page's.
 */
function isJobOutcome<Result>(value: unknown): value is JobOutcome<Result> {
  const status = readStringField(value, 'status');
  return status === 'completed' || status === 'unfinished';
}

/** Reports whether a value is a refusal body that names a known reason. */
function isRefusalBody(value: unknown): value is JobRefusalBody {
  const reason = readStringField(value, 'reason');
  return (
    reason !== undefined &&
    Object.hasOwn(REFUSAL_STATUSES, reason) &&
    readStringField(value, 'message') !== undefined &&
    (readField(value, 'limit') === undefined || readStringField(value, 'limit') !== undefined)
  );
}

/** Returns an own field of an object, or `undefined` when the value is not an object or lacks the field. */
function readField(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
}

/** Returns the message of a `failure` event, or a generic one when the event does not have one. */
function readFailureMessage(data: unknown): string {
  return readStringField(data, 'message') ?? 'The job failed at the endpoint.';
}

/** Returns a response's body parsed as JSON, or `undefined` when it is not JSON. */
async function readJsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Returns the error for a response that is not OK: a refusal, or a failure when the response is not a refusal. */
async function readRefusal(response: Response): Promise<JobRefusedError | JobRunError> {
  if (REFUSAL_STATUS_SET.has(response.status)) {
    const body = await readJsonBody(response);
    if (isRefusalBody(body)) {
      return new JobRefusedError({ status: response.status, ...body });
    }
  }
  return new JobRunError({ cause: new Error(`The endpoint responded with ${response.status}.`) });
}

/** Sends the job's request, reporting a request that gets no response as unreachable. */
async function requestJob(fetch: typeof globalThis.fetch, url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw new JobRunError({ cause: error, reason: 'unreachable' });
  }
}

/** Returns a string field of an object, or `undefined` when it is absent or not a string. */
function readStringField(value: unknown, key: string): string | undefined {
  const field = readField(value, key);
  return typeof field === 'string' ? field : undefined;
}
// endregion | Helpers
