import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';

import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import { buildRound, buildText, buildToolCall, ROUND_USAGE } from '../../test-utils/mock-stream.ts';
import { readJobStream } from '../../test-utils/readJobStream.ts';
import type { JobHandlerOptions, JobReservation, JobSettlement } from '../../types/endpoint.ts';
import { handleJobRequest } from '../handleJobRequest.ts';
import { JOB_FAILURE_BODY } from '../jobStream.ts';

const URL = 'https://app.example/api/job';
const ZERO = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

const OPTIONS: JobHandlerOptions<string> = {
  connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'unused' },
  maxInputLength: 20,
  createJob: (input) => ({ ...createSubmitJob(), input }),
};

describe(handleJobRequest, () => {
  it('reserves after counting the job and before the first model request, passing the request', async () => {
    const model = mockModel([buildRound([buildToolCall('c1', 'submit', { value: 'done' })])]);
    const request = buildPost();
    const calls: string[] = [];
    const countJob = vi.fn(() => {
      calls.push('count');
      return Promise.resolve({ allowed: true } as const);
    });
    const reserveJob = vi.fn(() => {
      calls.push('reserve');
      expect(model.doStreamCalls).toHaveLength(0);
      return Promise.resolve(buildReservation().reservation);
    });

    await readJobStream(await handleJobRequest(request, { ...OPTIONS, countJob, reserveJob }, model));

    expect(calls).toStrictEqual(['count', 'reserve']);
    expect(reserveJob).toHaveBeenCalledWith(request);
  });

  it("refuses a job that the reservation refuses, naming the reservation's limit", async () => {
    const model = mockModel([]);
    const reserveJob = () => Promise.resolve({ allowed: false, limit: 'site-budget' } as const);

    const response = await handleJobRequest(buildPost(), { ...OPTIONS, reserveJob }, model);

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ reason: 'limit-reached', limit: 'site-budget' });
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('refuses a job when the reservation throws, reporting the error to onError', async () => {
    const failure = new Error('redis down');
    const onError = vi.fn();
    const model = mockModel([]);

    const response = await handleJobRequest(
      buildPost(),
      { ...OPTIONS, reserveJob: () => Promise.reject(failure), onError },
      model,
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ reason: 'counter-unavailable' });
    expect(onError).toHaveBeenCalledWith(failure);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('does not reserve a job that the counter refuses', async () => {
    const reserveJob = vi.fn(() => Promise.resolve(buildReservation().reservation));
    const countJob = () => Promise.resolve({ allowed: false, limit: 'per-ip' } as const);

    const response = await handleJobRequest(buildPost(), { ...OPTIONS, countJob, reserveJob }, mockModel([]));

    expect(response.status).toBe(429);
    expect(reserveJob).not.toHaveBeenCalled();
  });

  it.each([
    ['the reservation', 100, undefined, [100, 70]],
    ['the job', 100, 50, [50, 20]],
  ])("caps the job's output at %s's lower cap", async (_label, reserved, jobCap, limits) => {
    const model = mockModel([
      buildRound([buildToolCall('c1', 'check', { draft: 'a' })], 'tool-calls', 30),
      buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
    ]);
    const createJob = (input: string) => ({
      ...createSubmitJob(),
      input,
      ...(jobCap !== undefined && { maxOutputTokens: jobCap }),
    });
    const { reservation } = buildReservation(reserved);

    await readJobStream(
      await handleJobRequest(
        buildPost(),
        { ...OPTIONS, createJob, reserveJob: () => Promise.resolve(reservation) },
        model,
      ),
    );

    expect(model.doStreamCalls.map((call) => call.maxOutputTokens)).toStrictEqual(limits);
  });

  it('settles a completed job with its usage', async () => {
    const model = mockModel([
      buildRound([buildToolCall('c1', 'check', { draft: 'a' })]),
      buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
    ]);
    const { reservation, settle } = buildReservation();

    await readJobStream(await handleJobRequest(buildPost(), reserving(reservation), model));

    expect(settle.mock.calls).toStrictEqual([[{ status: 'completed', usage: doubleUsage() }]]);
  });

  it('settles a job that the cap ends as unfinished', async () => {
    const model = mockModel([buildRound(buildText('truncated'), 'length', 10), buildRound(buildText('unreachable'))]);
    const { reservation, settle } = buildReservation(10);

    await readJobStream(await handleJobRequest(buildPost(), reserving(reservation), model));

    expect(settle.mock.calls).toStrictEqual([[{ status: 'unfinished', usage: { ...ROUND_USAGE, outputTokens: 10 } }]]);
  });

  it('settles a job that fails after a round with the usage of the rounds that reported', async () => {
    let requests = 0;
    const model = new MockLanguageModelV4({
      doStream: () => {
        requests += 1;
        if (requests > 1) return Promise.reject(new Error('down'));
        return Promise.resolve(buildRound([buildToolCall('c1', 'check', { draft: 'a' })]));
      },
    });
    const { reservation, settle } = buildReservation();

    const records = await readJobStream(await handleJobRequest(buildPost(), reserving(reservation), model));

    expect(records.at(-1)).toStrictEqual({ name: 'failure', data: JOB_FAILURE_BODY });
    expect(settle.mock.calls).toStrictEqual([[{ status: 'failed', usage: ROUND_USAGE }]]);
  });

  it.each([
    [
      'createJob throws',
      {},
      () => {
        throw new Error('bad job');
      },
    ],
    ['the job is invalid', {}, (input: string) => ({ ...createSubmitJob(), input, maxRounds: 0 })],
    ['the reservation is invalid', { maxOutputTokens: 1.5 }, (input: string) => ({ ...createSubmitJob(), input })],
  ])('settles as failed with zero usage and answers 500 when %s', async (_label, override, createJob) => {
    const { reservation, settle } = buildReservation();
    const onError = vi.fn();
    const model = mockModel([]);

    const response = await handleJobRequest(
      buildPost(),
      { ...OPTIONS, createJob, onError, reserveJob: () => Promise.resolve({ ...reservation, ...override }) },
      model,
    );

    expect(response.status).toBe(500);
    expect(onError).toHaveBeenCalledTimes(1);
    expect(settle.mock.calls).toStrictEqual([[{ status: 'failed', usage: ZERO }]]);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it.each([
    ['the request aborts', (run: Awaited<ReturnType<typeof startPausedRun>>) => run.abortRequest()],
    ['the reader cancels the stream', (run: Awaited<ReturnType<typeof startPausedRun>>) => run.reader?.cancel()],
  ])('settles as cancelled with the usage of the finished rounds when %s', async (_label, stop) => {
    const run = await startPausedRun();

    await stop(run);
    run.release();

    await vi.waitFor(() => {
      expect(run.settle.mock.calls).toStrictEqual([[{ status: 'cancelled', usage: ROUND_USAGE }]]);
    });
    expect(run.onError).not.toHaveBeenCalled();
  });

  it('closes the stream only once the settlement resolves', async () => {
    const { promise: settled, resolve: finishSettle } = Promise.withResolvers<undefined>();
    const { reservation, settle } = buildReservation(100, () => settled);
    const model = mockModel([buildRound([buildToolCall('c1', 'submit', { value: 'done' })])]);
    let isClosed = false;

    const response = await handleJobRequest(buildPost(), reserving(reservation), model);
    const reading = (async () => {
      const records = await readJobStream(response);
      isClosed = true;
      return records;
    })();
    await vi.waitFor(() => {
      expect(settle).toHaveBeenCalledTimes(1);
    });
    await Promise.resolve();

    expect(isClosed).toBe(false);
    finishSettle(undefined);
    await expect(reading).resolves.toMatchObject([{}, {}, {}, { name: 'outcome' }]);
  });

  it('reports a throwing settlement to onError without altering the stream', async () => {
    const failure = new Error('redis down');
    const onError = vi.fn();
    const { reservation } = buildReservation(100, () => Promise.reject(failure));
    const model = mockModel([buildRound([buildToolCall('c1', 'submit', { value: 'done' })])]);

    const records = await readJobStream(
      await handleJobRequest(buildPost(), { ...reserving(reservation), onError }, model),
    );

    expect(records.at(-1)).toMatchObject({ name: 'outcome', data: { status: 'completed' } });
    expect(onError).toHaveBeenCalledWith(failure);
  });
});

// region | Helpers
/** Builds a POST to the endpoint with a valid input. */
function buildPost(signal?: AbortSignal): Request {
  return new Request(URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: 'x' }),
    ...(signal !== undefined && { signal }),
  });
}

/** Builds a granted reservation whose `settle` is a mock, running `onSettle` when given. */
function buildReservation(maxOutputTokens = 100, onSettle: () => Promise<void> | void = () => {}) {
  const settle = vi.fn<(settlement: JobSettlement) => Promise<void> | void>(onSettle);
  const reservation: JobReservation = { allowed: true, maxOutputTokens, settle };
  return { reservation, settle };
}

/** Returns the usage of two rounds that each report `ROUND_USAGE`. */
function doubleUsage() {
  return {
    inputTokens: ROUND_USAGE.inputTokens * 2,
    outputTokens: ROUND_USAGE.outputTokens * 2,
    cacheReadTokens: ROUND_USAGE.cacheReadTokens * 2,
    cacheWriteTokens: ROUND_USAGE.cacheWriteTokens * 2,
  };
}

/** Creates a mock model that streams the given rounds in order. */
function mockModel(rounds: ReturnType<typeof buildRound>[]): MockLanguageModelV4 {
  return new MockLanguageModelV4({ doStream: rounds });
}

/** Returns the handler's options with a `reserveJob` that grants the reservation. */
function reserving(reservation: JobReservation): JobHandlerOptions<string> {
  return { ...OPTIONS, reserveJob: () => Promise.resolve(reservation) };
}

/**
 * Starts a reserved run whose first round finishes and whose second round's tool call waits until `release`, and
 * reads the stream's first chunk.
 */
async function startPausedRun() {
  const requestController = new AbortController();
  const { promise: checked, resolve: finishCheck } = Promise.withResolvers<unknown>();
  const { reservation, settle } = buildReservation();
  const onError = vi.fn();
  let checks = 0;
  const check = () => {
    checks += 1;
    return checks === 1 ? { ok: true } : checked;
  };
  const model = mockModel([
    buildRound([buildToolCall('c1', 'check', { draft: 'a' })]),
    buildRound([buildToolCall('c2', 'check', { draft: 'b' })]),
    buildRound(buildText('x')),
  ]);
  const createJob = (input: string) => ({ ...createSubmitJob({ check }), input });

  const response = await handleJobRequest(
    buildPost(requestController.signal),
    { ...reserving(reservation), createJob, onError },
    model,
  );
  const reader = response.body?.getReader();
  await vi.waitFor(() => {
    expect(checks).toBe(2);
  });

  return {
    onError,
    reader,
    settle,
    abortRequest: () => {
      requestController.abort();
      return Promise.resolve();
    },
    release: () => {
      finishCheck({ ok: true });
    },
  };
}
// endregion | Helpers
