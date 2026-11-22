import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import { buildRound, buildText, buildToolCall } from '../../test-utils/mock-stream.ts';
import { runJobOnModel } from '../runJobOnModel.ts';

describe(runJobOnModel, () => {
  it('limits each round to the output that remains of the cap', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'check', { draft: 'a' })], 'tool-calls', 30),
        buildRound([buildToolCall('c2', 'submit', { value: 'done' })], 'tool-calls', 20),
      ],
    });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxOutputTokens: 100 }, model);

    expect(outcome).toMatchObject({ status: 'completed', result: 'done' });
    expect(model.doStreamCalls.map((call) => call.maxOutputTokens)).toStrictEqual([100, 70]);
  });

  it('ends a job whose output reaches the cap before another round', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'check', { draft: 'a' })], 'tool-calls', 60),
        buildRound(buildText('truncated'), 'length', 40),
        buildRound(buildText('unreachable')),
      ],
    });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxOutputTokens: 100 }, model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'token-cap', rounds: 2 });
    expect(model.doStreamCalls).toHaveLength(2);
  });

  it('ends a job whose output reaches the cap in a round that calls tools, before another round', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'check', { draft: 'a' })], 'tool-calls', 100),
        buildRound(buildText('unreachable')),
      ],
    });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxOutputTokens: 100 }, model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'token-cap', rounds: 1 });
    expect(model.doStreamCalls).toHaveLength(1);
  });

  it('reports a job that reaches the cap on the round that produces its result as completed', async () => {
    const model = new MockLanguageModelV4({
      doStream: [buildRound([buildToolCall('c1', 'submit', { value: 'done' })], 'tool-calls', 100)],
    });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxOutputTokens: 100 }, model);

    expect(outcome).toMatchObject({ status: 'completed', result: 'done' });
  });

  it('reports a model that stops on its own at the cap as stopped', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('I give up.'), 'stop', 100)] });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxOutputTokens: 100 }, model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'stopped' });
  });

  it('reports a round truncated below the cap as stopped', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('truncated'), 'length', 40)] });

    const outcome = await runJobOnModel({ ...createSubmitJob(), maxOutputTokens: 100 }, model);

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'stopped' });
  });

  it('sends no output limit for a job without a cap', async () => {
    const model = new MockLanguageModelV4({
      doStream: [
        buildRound([buildToolCall('c1', 'check', { draft: 'a' })]),
        buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
      ],
    });

    await runJobOnModel(createSubmitJob(), model);

    expect(model.doStreamCalls.map((call) => call.maxOutputTokens)).toStrictEqual([undefined, undefined]);
  });

  it.each([0, -1, 1.5, NaN])('rejects a maxOutputTokens of %s with a RangeError', async (maxOutputTokens) => {
    const model = new MockLanguageModelV4({ doStream: [buildRound(buildText('Hi'))] });

    await expect(runJobOnModel({ ...createSubmitJob(), maxOutputTokens }, model)).rejects.toBeInstanceOf(RangeError);
    expect(model.doStreamCalls).toHaveLength(0);
  });
});
