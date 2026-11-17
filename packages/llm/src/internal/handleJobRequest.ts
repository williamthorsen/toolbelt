import type { LanguageModel } from 'ai';

import type { JobHandlerOptions, JobRefusalReason } from '../types/endpoint.ts';
import type { Job } from '../types/job.ts';
import { assertPositiveInteger } from './assertPositiveInteger.ts';
import { encodeStreamEvent, JOB_FAILURE_BODY, type JobRefusalBody, REFUSAL_STATUSES } from './jobStream.ts';
import { runJobOnModel } from './runJobOnModel.ts';

// JSON escapes a UTF-16 code unit in at most 6 bytes (`\uXXXX`), and the envelope `{"input":""}` takes a few more.
const BYTES_PER_INPUT_UNIT = 6;
const BODY_ENVELOPE_BYTES = 1024;

/**
 * Answers one request to a job endpoint: refuses it, or runs the job that its input builds on the model and streams
 * the job's events and outcome as server-sent events.
 *
 * @internal
 */
export async function handleJobRequest<Result>(
  request: Request,
  options: JobHandlerOptions<Result>,
  model: LanguageModel,
): Promise<Response> {
  const { maxInputLength } = options;
  if (request.method !== 'POST') {
    return refuse('method-not-allowed', 'The endpoint accepts only POST.', { allow: 'POST' });
  }
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > BYTES_PER_INPUT_UNIT * maxInputLength + BODY_ENVELOPE_BYTES) {
    return refuse('input-too-long', `The input exceeds ${maxInputLength} characters.`);
  }
  const input = await readInput(request);
  if (input === undefined) {
    return refuse('invalid-body', 'The body must be a JSON object with a string `input`.');
  }
  if (input.length > maxInputLength) {
    return refuse('input-too-long', `The input exceeds ${maxInputLength} characters.`);
  }

  const onError = buildErrorReporter(options.onError);
  if (options.checkBot !== undefined) {
    let passed;
    try {
      passed = await options.checkBot(request);
    } catch (error) {
      onError(error);
      return refuse('bot-check-unavailable', 'The bot check is unavailable.');
    }
    if (!passed) {
      return refuse('bot-check-failed', 'The bot check failed.');
    }
  }
  if (options.countJob !== undefined) {
    let count;
    try {
      count = await options.countJob(request);
    } catch (error) {
      onError(error);
      return refuse('counter-unavailable', 'The job counter is unavailable.');
    }
    if (!count.allowed) {
      return refuse('limit-reached', `The job limit "${count.limit}" is reached.`, {}, count.limit);
    }
  }

  let job: Job<Result>;
  try {
    job = capRounds(options.createJob(input), options.maxRounds);
    assertPositiveInteger(job.maxRounds, 'maxRounds');
  } catch (error) {
    onError(error);
    return Response.json(JOB_FAILURE_BODY, { status: 500 });
  }

  return new Response(streamJob(job, model, request.signal, onError), {
    headers: { 'cache-control': 'no-cache', 'content-type': 'text/event-stream' },
  });
}

// region | Helpers
/** Returns a reporter that passes an error to `onError` and ignores a throw from it. */
function buildErrorReporter(onError: ((error: unknown) => void) | undefined): (error: unknown) => void {
  return (error) => {
    try {
      onError?.(error);
    } catch {
      // The handler's response does not depend on the operator's callback.
    }
  };
}

/** Returns the job with its round cap lowered to `maxRounds`, delegating the rest to the job. */
function capRounds<Result>(job: Job<Result>, maxRounds: number | undefined): Job<Result> {
  if (maxRounds === undefined || maxRounds >= job.maxRounds) return job;
  return {
    instructions: job.instructions,
    input: job.input,
    tools: job.tools,
    maxRounds,
    readResult: () => job.readResult(),
  };
}

/** Returns the body's `input`, or `undefined` when the body is not a JSON object with a string `input`. */
async function readInput(request: Request): Promise<string | undefined> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return undefined;
  }
  if (typeof body !== 'object' || body === null || !('input' in body)) return undefined;
  return typeof body.input === 'string' ? body.input : undefined;
}

/** Builds a refusal's response, whose status follows from its reason. */
function refuse(
  reason: JobRefusalReason,
  message: string,
  headers: Record<string, string> = {},
  limit?: string,
): Response {
  const body: JobRefusalBody = { reason, message, ...(limit !== undefined && { limit }) };
  return Response.json(body, { status: REFUSAL_STATUSES[reason], headers });
}

/**
 * Runs the job, enqueuing its events and then its outcome, or a generic failure unless the run was aborted, and
 * closes the stream unless the reader cancelled it.
 */
async function pumpJob<Result>(
  job: Job<Result>,
  model: LanguageModel,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signals: { readonly request: AbortSignal; readonly cancel: AbortSignal },
  onError: (error: unknown) => void,
): Promise<void> {
  const signal = AbortSignal.any([signals.request, signals.cancel]);
  const encoder = new TextEncoder();
  function send(...event: Parameters<typeof encodeStreamEvent>): void {
    if (!signals.cancel.aborted) controller.enqueue(encoder.encode(encodeStreamEvent(...event)));
  }

  try {
    send('outcome', await runJobOnModel(job, model, { signal, onEvent: (event) => send('job-event', event) }));
  } catch (error) {
    if (!signal.aborted) {
      onError(error);
      send('failure', JOB_FAILURE_BODY);
    }
  }
  if (!signals.cancel.aborted) controller.close();
}

/** Returns a stream of the job's run, which stops when the request aborts or the reader cancels the stream. */
function streamJob<Result>(
  job: Job<Result>,
  model: LanguageModel,
  requestSignal: AbortSignal,
  onError: (error: unknown) => void,
): ReadableStream<Uint8Array> {
  const cancelController = new AbortController();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      void pumpJob(job, model, controller, { request: requestSignal, cancel: cancelController.signal }, onError);
    },
    cancel(reason) {
      cancelController.abort(reason);
    },
  });
}
// endregion | Helpers
