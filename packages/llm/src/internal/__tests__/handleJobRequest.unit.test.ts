import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';

import { JobRunError } from '../../1-proposed/JobRunError.ts';
import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import { buildRound, buildText, buildToolCall } from '../../test-utils/mock-stream.ts';
import { readJobStream } from '../../test-utils/readJobStream.ts';
import type { JobHandlerOptions } from '../../types/endpoint.ts';
import type { JobEvent } from '../../types/job.ts';
import { handleJobRequest } from '../handleJobRequest.ts';
import { JOB_FAILURE_BODY } from '../jobStream.ts';
import { runJobOnModel } from '../runJobOnModel.ts';

const URL = 'https://app.example/api/job';

const OPTIONS: JobHandlerOptions<string> = {
  connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'unused' },
  maxInputLength: 20,
  createJob: (input) => ({ ...createSubmitJob(), input }),
};

describe(handleJobRequest, () => {
  it('streams the events and outcome that the job reports when run directly', async () => {
    const rounds = () => [
      buildRound([...buildText('Checking.'), buildToolCall('c1', 'check', { draft: 'a' })]),
      buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
    ];
    const direct: JobEvent[] = [];
    const directOutcome = await runJobOnModel(createSubmitJob(), new MockLanguageModelV4({ doStream: rounds() }), {
      onEvent: (event) => {
        direct.push(event);
      },
    });

    const response = await handleJobRequest(buildPost({ input: 'Some prompt' }), OPTIONS, mockModel(rounds()));

    expect(response.headers.get('content-type')).toBe('text/event-stream');
    await expect(readJobStream(response)).resolves.toStrictEqual([
      ...direct.map((data) => ({ name: 'job-event', data })),
      { name: 'outcome', data: directOutcome },
    ]);
  });

  it.each([
    ['a GET', new Request(URL), 405, 'method-not-allowed'],
    ['a body that is not JSON', buildPost('{'), 400, 'invalid-body'],
    ['a body without input', buildPost({ prompt: 'x' }), 400, 'invalid-body'],
    ['an input that is not a string', buildPost({ input: 5 }), 400, 'invalid-body'],
    ['an input over the cap', buildPost({ input: 'x'.repeat(21) }), 413, 'input-too-long'],
    ['a content-length over the bound', buildPost({ input: 'x' }, { 'content-length': '2000' }), 413, 'input-too-long'],
  ])('refuses %s', async (_label, request, status, reason) => {
    const model = mockModel([]);

    const response = await handleJobRequest(request, OPTIONS, model);

    expect(response.status).toBe(status);
    await expect(response.json()).resolves.toMatchObject({ reason, message: expect.any(String) });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('accepts an empty input', async () => {
    const response = await handleJobRequest(
      buildPost({ input: '' }),
      OPTIONS,
      mockModel([buildRound([buildToolCall('c1', 'submit', { value: 'done' })])]),
    );

    expect(response.status).toBe(200);
  });

  it('counts the job before the first model request, passing the request', async () => {
    const model = mockModel([buildRound([buildToolCall('c1', 'submit', { value: 'done' })])]);
    const request = buildPost({ input: 'x' });
    const countJob = vi.fn(() => {
      expect(model.doStreamCalls).toHaveLength(0);
      return Promise.resolve({ allowed: true } as const);
    });

    const response = await handleJobRequest(request, { ...OPTIONS, countJob }, model);
    await readJobStream(response);

    expect(countJob).toHaveBeenCalledWith(request);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it("refuses a job that the counter refuses, naming the counter's limit", async () => {
    const model = mockModel([]);

    const response = await handleJobRequest(
      buildPost({ input: 'x' }),
      { ...OPTIONS, countJob: () => Promise.resolve({ allowed: false, limit: 'per-ip' }) },
      model,
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ reason: 'limit-reached', limit: 'per-ip' });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('refuses a job when the counter throws, reporting the error to onError', async () => {
    const failure = new Error('redis down');
    const onError = vi.fn();

    const response = await handleJobRequest(
      buildPost({ input: 'x' }),
      { ...OPTIONS, countJob: () => Promise.reject(failure), onError },
      mockModel([]),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ reason: 'counter-unavailable' });
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it('answers 500 with the generic failure when createJob throws, reporting the error to onError', async () => {
    const failure = new Error('bad job');
    const onError = vi.fn();
    const createJob = () => {
      throw failure;
    };

    const response = await handleJobRequest(
      buildPost({ input: 'x' }),
      { ...OPTIONS, createJob, onError },
      mockModel([]),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toStrictEqual(JOB_FAILURE_BODY);
    expect(onError).toHaveBeenCalledWith(failure);
  });

  it.each([
    ['the handler', 2, 5, 2],
    ['the job', 3, 1, 1],
  ])("applies %s's lower round cap", async (_label, handlerCap, jobCap, rounds) => {
    const model = mockModel([1, 2, 3].map((n) => buildRound([buildToolCall(`c${n}`, 'check', { draft: 'a' })])));
    const createJob = (input: string) => ({ ...createSubmitJob(), input, maxRounds: jobCap });

    const records = await readJobStream(
      await handleJobRequest(buildPost({ input: 'x' }), { ...OPTIONS, createJob, maxRounds: handlerCap }, model),
    );

    expect(records.at(-1)).toMatchObject({
      name: 'outcome',
      data: { status: 'unfinished', reason: 'round-cap', rounds },
    });
  });

  it('streams a generic failure for a provider error and reports the error to onError', async () => {
    const failure = new Error('provider down: credit balance too low');
    const onError = vi.fn();
    const model = new MockLanguageModelV4({ doStream: () => Promise.reject(failure) });

    const response = await handleJobRequest(buildPost({ input: 'x' }), { ...OPTIONS, onError }, model);
    const records = await readJobStream(response);

    expect(records).toStrictEqual([{ name: 'failure', data: JOB_FAILURE_BODY }]);
    expect(onError).toHaveBeenCalledWith(expect.any(JobRunError));
    expect(onError.mock.calls[0]?.[0]).toHaveProperty('cause', failure);
  });

  it('ends the stream with the generic failure when onError throws', async () => {
    const model = new MockLanguageModelV4({ doStream: () => Promise.reject(new Error('provider down')) });

    const response = await handleJobRequest(buildPost({ input: 'x' }), { ...OPTIONS, onError: throwingOnError }, model);

    await expect(readJobStream(response)).resolves.toStrictEqual([{ name: 'failure', data: JOB_FAILURE_BODY }]);
  });

  it.each([
    ['503 when the counter throws', { countJob: () => Promise.reject(new Error('redis down')) }, 503],
    [
      '500 when createJob throws',
      {
        createJob: () => {
          throw new Error('bad job');
        },
      },
      500,
    ],
  ])('answers %s even when onError throws', async (_label, override, status) => {
    const response = await handleJobRequest(
      buildPost({ input: 'x' }),
      { ...OPTIONS, ...override, onError: throwingOnError },
      mockModel([]),
    );

    expect(response.status).toBe(status);
  });

  it('stops the job without a failure when the reader cancels the stream', async () => {
    const run = await startPausedRun();

    await run.reader?.cancel();
    await run.waitForAbort();

    expect(run.model.doStreamCalls).toHaveLength(1);
    expect(run.onError).not.toHaveBeenCalled();
  });

  it('stops the job without a failure when the request aborts', async () => {
    const run = await startPausedRun();

    run.abortRequest();
    await run.waitForAbort();

    expect(run.model.doStreamCalls).toHaveLength(1);
    expect(run.onError).not.toHaveBeenCalled();
  });
});

// region | Helpers
/** Builds a POST to the endpoint with a JSON body, or with a raw string body. */
function buildPost(body: unknown, headers: Record<string, string> = {}, signal?: AbortSignal): Request {
  return new Request(URL, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
    ...(signal && { signal }),
  });
}

/** Throws, as an `onError` whose logger fails does. */
function throwingOnError(): never {
  throw new Error('logger down');
}

/** Creates a mock model that streams the given rounds in order. */
function mockModel(rounds: ReturnType<typeof buildRound>[]): MockLanguageModelV4 {
  return new MockLanguageModelV4({ doStream: rounds });
}

/**
 * Starts a run whose first tool call waits until `waitForAbort`, and reads the stream's first chunk. `waitForAbort`
 * releases the tool call and waits until the model's request is aborted.
 */
async function startPausedRun() {
  const requestController = new AbortController();
  const { promise: checked, resolve: finishCheck } = Promise.withResolvers<unknown>();
  const onError = vi.fn();
  const model = mockModel([buildRound([buildToolCall('c1', 'check', { draft: 'a' })]), buildRound(buildText('x'))]);
  const createJob = (input: string) => ({ ...createSubmitJob({ check: () => checked }), input });

  const response = await handleJobRequest(
    buildPost({ input: 'x' }, {}, requestController.signal),
    { ...OPTIONS, createJob, onError },
    model,
  );
  const reader = response.body?.getReader();
  await reader?.read();

  return {
    model,
    onError,
    reader,
    abortRequest: () => {
      requestController.abort();
    },
    waitForAbort: async () => {
      finishCheck({ ok: true });
      await vi.waitFor(() => {
        expect(model.doStreamCalls[0]?.abortSignal?.aborted).toBe(true);
      });
    },
  };
}
// endregion | Helpers
