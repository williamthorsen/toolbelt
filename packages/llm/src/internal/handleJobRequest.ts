import type { LanguageModel } from 'ai';

import type { JobHandlerOptions, JobRefusalReason, JobReservation, JobSettlement } from '../types/endpoint.ts';
import type { Job, Usage } from '../types/job.ts';
import { assertPositiveInteger } from './assertPositiveInteger.ts';
import { encodeStreamEvent, JOB_FAILURE_BODY, type JobRefusalBody, REFUSAL_STATUSES } from './jobStream.ts';
import { runJobOnModel } from './runJobOnModel.ts';
import { addUsage, ZERO_USAGE } from './usage.ts';

/** Settles the job's reservation, if any, at most once. */
type Settle = (settlement: JobSettlement) => Promise<void>;

/** What a job's stream reports to besides the page. */
interface StreamContext {
  readonly request: AbortSignal;
  readonly onError: (error: unknown) => void;
  readonly settle: Settle;
}

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

  let reservation: Extract<JobReservation, { allowed: true }> | undefined;
  if (options.reserveJob !== undefined) {
    let reserved;
    try {
      reserved = await options.reserveJob(request);
    } catch (error) {
      onError(error);
      return refuse('counter-unavailable', 'The job budget is unavailable.');
    }
    if (!reserved.allowed) {
      return refuse('limit-reached', `The job limit "${reserved.limit}" is reached.`, {}, reserved.limit);
    }
    reservation = reserved;
  }
  const settle = buildSettler(reservation, onError);

  let job: Job<Result>;
  try {
    if (reservation !== undefined) assertPositiveInteger(reservation.maxOutputTokens, 'maxOutputTokens');
    job = capJob(options.createJob(input), options.maxRounds, reservation?.maxOutputTokens);
    assertPositiveInteger(job.maxRounds, 'maxRounds');
    if (job.maxOutputTokens !== undefined) assertPositiveInteger(job.maxOutputTokens, 'maxOutputTokens');
  } catch (error) {
    onError(error);
    await settle({ status: 'failed', usage: ZERO_USAGE });
    return Response.json(JOB_FAILURE_BODY, { status: 500 });
  }

  return new Response(streamJob(job, model, { request: request.signal, onError, settle }), {
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

/** Returns a settler that settles the reservation once and passes a failed settlement to `onError`. */
function buildSettler(
  reservation: Extract<JobReservation, { allowed: true }> | undefined,
  onError: (error: unknown) => void,
): Settle {
  let isSettled = false;
  return async (settlement) => {
    if (reservation === undefined || isSettled) return;
    isSettled = true;
    try {
      await reservation.settle(settlement);
    } catch (error) {
      onError(error);
    }
  };
}

/**
 * Returns the job with its round cap lowered to `maxRounds` and its output cap lowered to `maxOutputTokens`, each
 * when it is lower than the job's own, delegating the rest to the job.
 */
function capJob<Result>(
  job: Job<Result>,
  maxRounds: number | undefined,
  maxOutputTokens: number | undefined,
): Job<Result> {
  const cappedRounds = lowerCap(job.maxRounds, maxRounds);
  const cappedOutput =
    job.maxOutputTokens === undefined ? maxOutputTokens : lowerCap(job.maxOutputTokens, maxOutputTokens);
  if (cappedRounds === job.maxRounds && cappedOutput === job.maxOutputTokens) return job;
  return {
    instructions: job.instructions,
    input: job.input,
    tools: job.tools,
    maxRounds: cappedRounds,
    ...(cappedOutput !== undefined && { maxOutputTokens: cappedOutput }),
    readResult: () => job.readResult(),
  };
}

/** Returns the lower of a job's own cap and the handler's, when the handler has one. */
function lowerCap(own: number, cap: number | undefined): number {
  return cap === undefined ? own : Math.min(own, cap);
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
 * Runs the job, enqueuing its events and then its outcome, or a generic failure unless the run was aborted, settles
 * its reservation, and closes the stream unless the reader cancelled it.
 */
async function pumpJob<Result>(
  job: Job<Result>,
  model: LanguageModel,
  controller: ReadableStreamDefaultController<Uint8Array>,
  signals: { readonly request: AbortSignal; readonly cancel: AbortSignal },
  { onError, settle }: Pick<StreamContext, 'onError' | 'settle'>,
): Promise<void> {
  const signal = AbortSignal.any([signals.request, signals.cancel]);
  const encoder = new TextEncoder();
  function send(...event: Parameters<typeof encodeStreamEvent>): void {
    if (!signals.cancel.aborted) controller.enqueue(encoder.encode(encodeStreamEvent(...event)));
  }

  let usage: Usage = ZERO_USAGE;
  let settlement: JobSettlement;
  try {
    const outcome = await runJobOnModel(job, model, {
      signal,
      onEvent: (event) => {
        if (event.type === 'round-finished') usage = addUsage(usage, event.usage);
        send('job-event', event);
      },
    });
    send('outcome', outcome);
    settlement = { status: outcome.status, usage: outcome.usage };
  } catch (error) {
    settlement = { status: signal.aborted ? 'cancelled' : 'failed', usage };
    if (!signal.aborted) {
      onError(error);
      send('failure', JOB_FAILURE_BODY);
    }
  }
  await settle(settlement);
  if (!signals.cancel.aborted) controller.close();
}

/** Returns a stream of the job's run, which stops when the request aborts or the reader cancels the stream. */
function streamJob<Result>(job: Job<Result>, model: LanguageModel, context: StreamContext): ReadableStream<Uint8Array> {
  const cancelController = new AbortController();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      void pumpJob(job, model, controller, { request: context.request, cancel: cancelController.signal }, context);
    },
    cancel(reason) {
      cancelController.abort(reason);
    },
  });
}
// endregion | Helpers
