import type { LanguageModelV4StreamPart, LanguageModelV4StreamResult } from '@ai-sdk/provider';
import { convertArrayToReadableStream, MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { JobRunError } from '../../1-proposed/JobRunError.ts';
import type { Job, JobEvent } from '../../types/job.ts';
import { runJobOnModel } from '../runJobOnModel.ts';

const ROUND_USAGE = { inputTokens: 10, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 1 };

describe(runJobOnModel, () => {
  it('reports each event in order and completes on the round in which the result appears', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([...buildText('Checking.'), buildToolCall('c1', 'check', { draft: 'a' })]),
        buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
        buildRound(buildText('unreachable')),
      ],
    });
    const events: JobEvent[] = [];

    const outcome = await runJobOnModel(createSubmitJob(), model, {
      onEvent: (event) => {
        events.push(event);
      },
    });

    expect(outcome).toStrictEqual({
      status: 'completed',
      result: 'done',
      rounds: 2,
      usage: { inputTokens: 20, outputTokens: 6, cacheReadTokens: 10, cacheWriteTokens: 2 },
    });
    expect(model.doStreamCalls).toHaveLength(2);
    expect(events).toStrictEqual([
      { type: 'text-delta', text: 'Checking.' },
      { type: 'tool-call', callId: 'c1', toolName: 'check', input: { draft: 'a' } },
      { type: 'tool-result', callId: 'c1', toolName: 'check', output: { ok: true } },
      { type: 'round-finished', round: 1, usage: ROUND_USAGE },
      { type: 'tool-call', callId: 'c2', toolName: 'submit', input: { value: 'done' } },
      { type: 'tool-result', callId: 'c2', toolName: 'submit', output: 'accepted' },
      { type: 'round-finished', round: 2, usage: ROUND_USAGE },
    ]);
  });

  it('stops at the round cap without a result', async () => {
    const model = new MockLanguageModelV4({
      doStream: [1, 2, 3].map((n) => buildRound([buildToolCall(`c${n}`, 'check', { draft: 'a' })])),
    });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxRounds: 2 }, model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'round-cap', rounds: 2 });
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('reports a model that stops calling tools before the job has a result', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('I give up.'), 'stop')] });

    const outcome = await runJobOnModel(createSubmitJob(), model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'stopped', rounds: 1 });
  });

  it("returns a tool's invalid input to the model rather than failing the run", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'submit', { value: 5 })]),
        buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
      ],
    });

    const outcome = await runJobOnModel(createSubmitJob(), model);

    expect(outcome).toMatchObject({ status: 'completed', result: 'done', rounds: 2 });
    expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).toContain('c1');
  });

  it('sends the instructions as a system message marked for Anthropic prompt caching', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound([buildToolCall('c1', 'submit', { value: 'x' })])] });

    await runJobOnModel(createSubmitJob(), model);

    expect(model.doStreamCalls[0]?.prompt[0]).toMatchObject({
      role: 'system',
      content: 'Convert the input.',
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    });
  });

  it('rejects with JobRunError holding the error that a tool threw', async () => {
    const failure = new Error('defect');
    const model = new MockLanguageModelV4({
      doStream: [buildRound([buildToolCall('c1', 'check', { draft: 'a' })]), buildRound(buildText('unreachable'))],
    });
    const job = createSubmitJob({
      check: () => {
        throw failure;
      },
    });

    const error = await captureRejection(runJobOnModel(job, model));

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toHaveProperty('cause', failure);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it('rejects with JobRunError holding a provider error', async () => {
    const failure = new Error('provider down');
    const model = new MockLanguageModelV4({
      doStream: () => Promise.reject(failure),
    });

    const error = await captureRejection(runJobOnModel(createSubmitJob(), model));

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toHaveProperty('cause', failure);
  });

  it('rejects with JobRunError holding an error that the stream reports', async () => {
    const model = new MockLanguageModelV4({
      doStream: [buildRound([{ type: 'error', error: 'overloaded' }])],
    });

    const error = await captureRejection(runJobOnModel(createSubmitJob(), model));

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toHaveProperty('cause', 'overloaded');
  });

  it('rejects with JobRunError holding an error that onEvent threw', async () => {
    const failure = new Error('listener');
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('Hi'))] });

    const error = await captureRejection(
      runJobOnModel(createSubmitJob(), model, {
        onEvent: () => {
          throw failure;
        },
      }),
    );

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toHaveProperty('cause', failure);
  });

  it("rejects with the signal's reason, without a request, when the signal is already aborted", async () => {
    const reason = new Error('cancelled');
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('Hi'))] });

    await expect(runJobOnModel(createSubmitJob(), model, { signal: AbortSignal.abort(reason) })).rejects.toBe(reason);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it("rejects with the signal's reason when the signal aborts during the run", async () => {
    const reason = new Error('cancelled');
    const controller = new AbortController();
    const model = new MockLanguageModelV4({
      doStream: [buildRound([buildToolCall('c1', 'check', { draft: 'a' })]), buildRound(buildText('unreachable'))],
    });
    const job = createSubmitJob({
      check: () => {
        controller.abort(reason);
        return { ok: true };
      },
    });

    await expect(runJobOnModel(job, model, { signal: controller.signal })).rejects.toBe(reason);
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it.each([0, -1, 1.5, NaN])('rejects a maxRounds of %s with a RangeError', async (maxRounds) => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('Hi'))] });

    await expect(runJobOnModel({ ...createSubmitJob(), maxRounds }, model)).rejects.toBeInstanceOf(RangeError);
    expect(model.doStreamCalls).toHaveLength(0);
  });

  it('produces events and an outcome that survive JSON serialization', async () => {
    const model = new MockLanguageModelV4({
      doStream: [buildRound([...buildText('Hi'), buildToolCall('c1', 'submit', { value: 'done' })])],
    });
    const events: JobEvent[] = [];

    const outcome = await runJobOnModel(createSubmitJob(), model, {
      onEvent: (event) => {
        events.push(event);
      },
    });

    // eslint-disable-next-line unicorn/prefer-structured-clone -- the test checks JSON serialization, not cloning.
    expect(JSON.parse(JSON.stringify({ events, outcome }))).toStrictEqual({ events, outcome });
  });
});

// region | Helpers
/** Returns the error with which a promise rejects, failing when it resolves. */
async function captureRejection(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error('The promise resolved.');
}

/** Returns the stream parts of one text block. */
function buildText(text: string): LanguageModelV4StreamPart[] {
  return [
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: text },
    { type: 'text-end', id: 't' },
  ];
}

/** Returns one round's stream: its content, then a finish part that reports `ROUND_USAGE`. */
function buildRound(
  content: LanguageModelV4StreamPart[],
  finishReason: 'stop' | 'tool-calls' = 'tool-calls',
): LanguageModelV4StreamResult {
  return {
    stream: convertArrayToReadableStream<LanguageModelV4StreamPart>([
      { type: 'stream-start', warnings: [] },
      ...content,
      {
        type: 'finish',
        finishReason: { unified: finishReason, raw: finishReason },
        usage: {
          inputTokens: { total: 10, noCache: 4, cacheRead: 5, cacheWrite: 1 },
          outputTokens: { total: 3, text: 3, reasoning: undefined },
        },
      },
    ]),
  };
}

/** Returns a tool-call stream part with its input encoded as the provider sends it. */
function buildToolCall(toolCallId: string, toolName: string, input: unknown): LanguageModelV4StreamPart {
  return { type: 'tool-call', toolCallId, toolName, input: JSON.stringify(input) };
}

/**
 * Creates a job whose `submit` tool sets the result and whose `check` tool reports success, with any tool replaced
 * by an override's `execute`.
 */
function createSubmitJob(overrides: { check?: () => unknown } = {}): Job<string> {
  let result: string | undefined;
  return {
    instructions: 'Convert the input.',
    input: 'Some prompt',
    maxRounds: 5,
    readResult: () => result,
    tools: {
      check: {
        description: 'Checks a draft.',
        inputSchema: z.object({ draft: z.string() }),
        execute: overrides.check ?? (() => ({ ok: true })),
      },
      submit: {
        description: 'Submits the result.',
        inputSchema: z.object({ value: z.string() }),
        execute: (input: { value: string }) => {
          result = input.value;
          return 'accepted';
        },
      },
    },
  };
}
// endregion | Helpers
