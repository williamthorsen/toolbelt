import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';

import { JobRefusedError } from '../../1-proposed/JobRefusedError.ts';
import { JobRunError } from '../../1-proposed/JobRunError.ts';
import { captureRejection } from '../../test-utils/captureRejection.ts';
import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import type { JobHandlerOptions } from '../../types/endpoint.ts';
import type { JobEvent, JobOutcome } from '../../types/job.ts';
import { handleJobRequest } from '../handleJobRequest.ts';
import { encodeStreamEvent, JOB_FAILURE_BODY, type JobStreamEventName } from '../jobStream.ts';
import { runJobAtEndpoint } from '../runJobAtEndpoint.ts';

const CONNECTION = { url: 'https://app.example/api/job', headers: { 'x-bot-check': 'token' } };

const HANDLER_OPTIONS: JobHandlerOptions<string> = {
  connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'unused' },
  maxInputLength: 20,
  createJob: (input) => ({ ...createSubmitJob(), input }),
};

const EVENT: JobEvent = { type: 'text-delta', text: 'Hi' };

const OUTCOME: JobOutcome<string> = {
  status: 'completed',
  result: 'done',
  rounds: 1,
  usage: { inputTokens: 1, outputTokens: 1, cacheReadTokens: 0, cacheWriteTokens: 0 },
};

describe(runJobAtEndpoint, () => {
  it("posts the job's input with the connection's headers, reports each event, and returns the outcome", async () => {
    const fetch = vi.fn(() => Promise.resolve(buildStream(['job-event', EVENT], ['outcome', OUTCOME])));
    const events: JobEvent[] = [];

    const outcome = await runJobAtEndpoint(
      createSubmitJob(),
      { ...CONNECTION, headers: { ...CONNECTION.headers, accept: 'application/x-ndjson' } },
      {
        onEvent: (event) => {
          events.push(event);
        },
      },
      fetch,
    );

    expect(outcome).toStrictEqual(OUTCOME);
    expect(events).toStrictEqual([EVENT]);
    expect(fetch).toHaveBeenCalledWith(CONNECTION.url, {
      method: 'POST',
      headers: { accept: 'application/x-ndjson', 'content-type': 'application/json', 'x-bot-check': 'token' },
      body: JSON.stringify({ input: 'Some prompt' }),
      signal: expect.any(AbortSignal),
    });
  });

  it("rejects with JobRefusedError naming the counter's limit", async () => {
    const body = { reason: 'limit-reached', message: 'The job limit "per-ip" is reached.', limit: 'per-ip' };

    const error = await captureRejection(run(Response.json(body, { status: 429 })));

    expect(error).toBeInstanceOf(JobRefusedError);
    expect(error).toMatchObject({ status: 429, reason: 'limit-reached', limit: 'per-ip', message: body.message });
  });

  it.each([
    ['bot-check-failed', 403],
    ['bot-check-unavailable', 503],
  ])('rejects with JobRefusedError for a %s refusal', async (reason, status) => {
    const body = { reason, message: 'The bot check did not pass.' };

    const error = await captureRejection(run(Response.json(body, { status })));

    expect(error).toBeInstanceOf(JobRefusedError);
    expect(error).toMatchObject({ status, reason });
  });

  it.each([
    ['an object', { balance: 0, readyAt: '2026-11-23T05:00:00.000Z', nested: [1, null] }],
    ['null', null],
  ])("passes a reservation refusal's details, %s, to JobRefusedError unchanged", async (_label, details) => {
    const reserveJob = () => Promise.resolve({ allowed: false, limit: 'site-budget', details } as const);
    const response = await handleJobRequest(
      new Request(CONNECTION.url, { method: 'POST', body: JSON.stringify({ input: 'x' }) }),
      { ...HANDLER_OPTIONS, reserveJob },
      new MockLanguageModelV4(),
    );

    const error = await captureRejection(run(response));

    expect(error).toBeInstanceOf(JobRefusedError);
    expect(error).toHaveProperty('details', details);
  });

  it('rejects with JobRefusedError without details for a refusal that does not have any', async () => {
    const body = { reason: 'limit-reached', message: 'The job limit "per-ip" is reached.', limit: 'per-ip' };

    const error = await captureRejection(run(Response.json(body, { status: 429 })));

    expect(error).not.toHaveProperty('details');
  });

  it('rejects with JobRefusedError without a limit for a refusal that does not name one', async () => {
    const body = { reason: 'input-too-long', message: 'The input exceeds 20 characters.' };

    const error = await captureRejection(run(Response.json(body, { status: 413 })));

    expect(error).toBeInstanceOf(JobRefusedError);
    expect(error).not.toHaveProperty('limit');
  });

  it.each([
    ['a status that is not a refusal', new Response('Gateway timeout', { status: 504 }), 'responded with 504'],
    ['an unauthorized status', new Response('Unauthorized', { status: 401 }), 'responded with 401'],
    ['a refusal status without a refusal body', new Response('Busy', { status: 429 }), 'responded with 429'],
    ['a failure event', buildStream(['job-event', EVENT], ['failure', JOB_FAILURE_BODY]), JOB_FAILURE_BODY.message],
    ['a stream that ends without an outcome', buildStream(['job-event', EVENT]), 'before the job finished'],
    ['an event of an unknown type', buildStream(['job-event', { type: 'other' }]), 'unknown type'],
  ])('rejects with JobRunError for %s', async (_label, response, message) => {
    const error = await captureRejection(run(response));

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toMatchObject({ reason: 'failed', cause: { message: expect.stringContaining(message) } });
  });

  it('rejects with an unreachable JobRunError holding a network error', async () => {
    const failure = new TypeError('fetch failed');

    const error = await captureRejection(
      runJobAtEndpoint(createSubmitJob(), CONNECTION, {}, () => Promise.reject(failure)),
    );

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toMatchObject({ reason: 'unreachable', cause: failure });
  });

  it('rejects with JobRunError holding an error that onEvent threw, and aborts the request', async () => {
    const failure = new Error('listener');
    const fetch = vi.fn((..._args: Parameters<typeof globalThis.fetch>) =>
      Promise.resolve(buildStream(['job-event', EVENT], ['outcome', OUTCOME])),
    );

    const error = await captureRejection(
      runJobAtEndpoint(
        createSubmitJob(),
        CONNECTION,
        {
          onEvent: () => {
            throw failure;
          },
        },
        fetch,
      ),
    );

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toHaveProperty('cause', failure);
    expect(fetch.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
  });

  it("rejects with the signal's reason, without a request, when the signal is already aborted", async () => {
    const reason = new Error('cancelled');
    const fetch = vi.fn(() => Promise.resolve(buildStream(['outcome', OUTCOME])));

    await expect(
      runJobAtEndpoint(createSubmitJob(), CONNECTION, { signal: AbortSignal.abort(reason) }, fetch),
    ).rejects.toBe(reason);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects with the signal's reason when the signal aborts during the stream", async () => {
    const reason = new Error('cancelled');
    const controller = new AbortController();

    const run = runJobAtEndpoint(
      createSubmitJob(),
      CONNECTION,
      {
        signal: controller.signal,
        onEvent: () => {
          controller.abort(reason);
        },
      },
      () => Promise.resolve(buildStream(['job-event', EVENT], ['outcome', OUTCOME])),
    );

    await expect(run).rejects.toBe(reason);
  });
});

// region | Helpers
/** Builds a streamed response of the given server-sent events. */
function buildStream(...events: [JobStreamEventName, unknown][]): Response {
  return new Response(events.map(([name, data]) => encodeStreamEvent(name, data)).join(''), {
    headers: { 'content-type': 'text/event-stream' },
  });
}

/** Runs the submit job against an endpoint that answers with the response. */
function run(response: Response): Promise<JobOutcome<string>> {
  return runJobAtEndpoint(createSubmitJob(), CONNECTION, {}, () => Promise.resolve(response));
}
// endregion | Helpers
