import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it, vi } from 'vitest';

import { handleJobRequest } from '../internal/handleJobRequest.ts';
import { runJobAtEndpoint } from '../internal/runJobAtEndpoint.ts';
import { runJobOnModel } from '../internal/runJobOnModel.ts';
import { createSubmitJob } from '../test-utils/createSubmitJob.ts';
import { buildRound, buildText, buildToolCall } from '../test-utils/mock-stream.ts';
import type { JobHandlerOptions } from '../types/endpoint.ts';
import type { Job, JobEvent } from '../types/job.ts';

const CONNECTION = { url: 'https://app.example/api/job' };

describe('A job run in the page against the handler', () => {
  it('reports the same events and outcome as the job run in the page on a model', async () => {
    const rounds = () => [
      buildRound([...buildText('Checking.'), buildToolCall('c1', 'check', { draft: 'a' })]),
      buildRound([buildToolCall('c2', 'submit', { value: 'done' })]),
    ];
    const inPage: JobEvent[] = [];
    const atEndpoint: JobEvent[] = [];

    const inPageOutcome = await runJobOnModel(
      createJob('Some prompt'),
      new MockLanguageModelV4({ doStream: rounds() }),
      {
        onEvent: (event) => {
          inPage.push(event);
        },
      },
    );
    const endpointOutcome = await runJobAtEndpoint(
      createJob('Some prompt'),
      CONNECTION,
      {
        onEvent: (event) => {
          atEndpoint.push(event);
        },
      },
      serve(buildOptions(), new MockLanguageModelV4({ doStream: rounds() })),
    );

    expect(endpointOutcome).toStrictEqual(inPageOutcome);
    expect(atEndpoint).toStrictEqual(inPage);
  });

  it("stops the job at the endpoint when the page's signal aborts", async () => {
    const reason = new Error('cancelled');
    const controller = new AbortController();
    const { promise: checked, resolve: finishCheck } = Promise.withResolvers<unknown>();
    const model = new MockLanguageModelV4({
      doStream: [buildRound([buildToolCall('c1', 'check', { draft: 'a' })]), buildRound(buildText('x'))],
    });
    const options = buildOptions((input) => ({ ...createSubmitJob({ check: () => checked }), input }));

    const run = runJobAtEndpoint(
      createJob('Some prompt'),
      CONNECTION,
      {
        signal: controller.signal,
        onEvent: (event) => {
          if (event.type === 'tool-call') controller.abort(reason);
        },
      },
      serve(options, model),
    );

    await expect(run).rejects.toBe(reason);
    finishCheck({ ok: true });
    await vi.waitFor(() => {
      expect(model.doStreamCalls[0]?.abortSignal?.aborted).toBe(true);
    });
    expect(model.doStreamCalls).toHaveLength(1);
  });
});

// region | Helpers
/** Builds handler options whose jobs come from `createJob`. */
function buildOptions(job: (input: string) => Job<string> = createJob): JobHandlerOptions<string> {
  return {
    connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'unused' },
    maxInputLength: 100,
    createJob: job,
  };
}

/** Creates the job that both the page and the endpoint run. */
function createJob(input: string): Job<string> {
  return { ...createSubmitJob(), input };
}

/** Returns a `fetch` that hands each request to the handler, so that the init's signal becomes the request's. */
function serve(options: JobHandlerOptions<string>, model: MockLanguageModelV4): typeof globalThis.fetch {
  return (input, init) => handleJobRequest(new Request(input, init), options, model);
}
// endregion | Helpers
