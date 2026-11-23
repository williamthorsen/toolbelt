import type { LanguageModelV4Prompt } from '@ai-sdk/provider';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { JobRunError } from '../../1-proposed/JobRunError.ts';
import { captureRejection } from '../../test-utils/captureRejection.ts';
import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import { buildRound, buildText, buildToolCall, ROUND_USAGE } from '../../test-utils/mock-stream.ts';
import type { JobEvent } from '../../types/job.ts';
import { runJobOnModel } from '../runJobOnModel.ts';

const CACHE_BREAKPOINT = { anthropic: { cacheControl: { type: 'ephemeral' } } };

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

  it('reports a model that stops on the last allowed round as stopped, not as reaching the cap', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('I give up.'), 'stop')] });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxRounds: 1 }, model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'stopped', rounds: 1 });
  });

  it('reports a model that stops calling tools before the job has a result', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('I give up.'), 'stop')] });

    const outcome = await runJobOnModel(createSubmitJob(), model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'stopped', rounds: 1 });
  });

  it("returns a tool's invalid input to the model and reports the call's error", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'submit', { value: 5 })]),
        buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
      ],
    });
    const events: JobEvent[] = [];

    const outcome = await runJobOnModel(createSubmitJob(), model, {
      onEvent: (event) => {
        events.push(event);
      },
    });

    expect(outcome).toMatchObject({ status: 'completed', result: 'done', rounds: 2 });
    expect(events.slice(0, 2)).toStrictEqual([
      { type: 'tool-call', callId: 'c1', toolName: 'submit', input: { value: 5 } },
      { type: 'tool-error', callId: 'c1', toolName: 'submit', message: expect.any(String) },
    ]);
    expect(JSON.stringify(model.doStreamCalls[1]?.prompt)).toContain('c1');
  });

  it('sends the instructions as a system message marked for Anthropic prompt caching', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound([buildToolCall('c1', 'submit', { value: 'x' })])] });

    await runJobOnModel(createSubmitJob(), model);

    expect(model.doStreamCalls[0]?.prompt[0]).toMatchObject({
      role: 'system',
      content: 'Convert the input.',
      providerOptions: CACHE_BREAKPOINT,
    });
  });

  it("marks the end of the conversation and of the previous round's request as cache breakpoints", async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'check', { draft: 'a' })]),
        buildRound([buildToolCall('c2', 'check', { draft: 'b' })]),
        buildRound([buildToolCall('c3', 'submit', { value: 'done' })]),
      ],
    });

    await runJobOnModel(createSubmitJob(), model);

    // The prompt's first entry is the system message; the conversation follows it.
    expect(model.doStreamCalls.map((call) => listMarkedIndexes(call.prompt.slice(1)))).toStrictEqual([
      [0],
      [0, 2],
      [2, 4],
    ]);
    expect(model.doStreamCalls[2]?.prompt[0]).toMatchObject({ providerOptions: CACHE_BREAKPOINT });
  });

  it('changes nothing in the prompt but the provider options of the conversation', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'check', { draft: 'a' })]),
        buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
      ],
    });

    await runJobOnModel(createSubmitJob(), model);

    const prompt = model.doStreamCalls[1]?.prompt ?? [];
    expect(prompt.slice(1).map(({ providerOptions: _providerOptions, ...message }) => message)).toStrictEqual([
      { role: 'user', content: [{ type: 'text', text: expect.any(String) }] },
      { role: 'assistant', content: [expect.objectContaining({ type: 'tool-call', toolCallId: 'c1' })] },
      { role: 'tool', content: [expect.objectContaining({ type: 'tool-result', toolCallId: 'c1' })] },
    ]);
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

    const events: JobEvent[] = [];

    const error = await captureRejection(
      runJobOnModel(job, model, {
        onEvent: (event) => {
          events.push(event);
        },
      }),
    );

    expect(error).toBeInstanceOf(JobRunError);
    expect(error).toHaveProperty('cause', failure);
    expect(model.doStreamCalls).toHaveLength(1);
    expect(events).toContainEqual({ type: 'tool-error', callId: 'c1', toolName: 'check', message: 'defect' });
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
/** Lists the indexes of the messages that end with an Anthropic cache breakpoint. */
function listMarkedIndexes(messages: LanguageModelV4Prompt): number[] {
  return messages
    .map((message, index) => (message.providerOptions?.['anthropic']?.['cacheControl'] === undefined ? -1 : index))
    .filter((index) => index >= 0);
}
// endregion | Helpers
