import { APICallError } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { JobRunError } from '../../1-proposed/JobRunError.ts';
import { captureRejection } from '../../test-utils/captureRejection.ts';
import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import { buildRound, buildToolCall } from '../../test-utils/mock-stream.ts';
import type { UserCredential } from '../../types/credential.ts';
import { createModel } from '../createModel.ts';
import { runJobOnModel } from '../runJobOnModel.ts';

// The bodies that each provider returns for a key that it does not accept.
const REFUSALS: ReadonlyArray<readonly [UserCredential, number, unknown, string]> = [
  [
    { provider: 'anthropic', apiKey: 'k' },
    401,
    { type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } },
    'invalid x-api-key',
  ],
  [
    { provider: 'google', apiKey: 'k' },
    400,
    {
      error: {
        code: 400,
        message: 'API key not valid. Please pass a valid API key.',
        status: 'INVALID_ARGUMENT',
        details: [{ reason: 'API_KEY_INVALID' }],
      },
    },
    'API key not valid',
  ],
  [
    { provider: 'openai', apiKey: 'k' },
    401,
    { error: { message: 'Incorrect API key provided', type: 'invalid_request_error', code: 'invalid_api_key' } },
    'Incorrect API key provided',
  ],
  [
    { provider: 'openrouter', apiKey: 'k' },
    401,
    { error: { message: 'User not found.', code: 401 } },
    'User not found.',
  ],
];

describe(runJobOnModel, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(REFUSALS)(
    'rejects a key that %o refuses as a refused credential with its message',
    async (credential, status, body, message) => {
      const model = createModel({ ...credential, model: 'm' }, () => Promise.resolve(Response.json(body, { status })));

      const error = await captureRejection(runJobOnModel(createSubmitJob(), model));

      expect(error).toBeInstanceOf(JobRunError);
      expect(error).toMatchObject({ reason: 'credential-refused', providerMessage: expect.stringContaining(message) });
    },
  );

  it.each(['Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed'])(
    "rejects a request that the browser fails with '%s' as unreachable, after the retries",
    async (message) => {
      vi.useFakeTimers();
      const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError(message));
      const model = createModel({ provider: 'openai', apiKey: 'k', model: 'm' }, fetch);

      const rejection = captureRejection(runJobOnModel(createSubmitJob(), model));
      await vi.runAllTimersAsync();
      const error = await rejection;

      expect(error).toBeInstanceOf(JobRunError);
      expect(error).toMatchObject({ reason: 'unreachable' });
      expect(fetch.mock.calls.length).toBeGreaterThan(1);
    },
  );

  it.each(REFUSALS.map(([credential]) => credential.provider))(
    'reports a %s key that a header cannot carry as failed, without a request',
    async (provider) => {
      const fetch = vi.fn<typeof globalThis.fetch>();
      const model = createModel({ provider, apiKey: 'k\u{2019}', model: 'm' }, fetch);

      const error = await captureRejection(runJobOnModel(createSubmitJob(), model));

      expect(error).toMatchObject({ reason: 'failed' });
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it('reports a TypeError that fetch throws for its input as failed, without retrying', async () => {
    const fetch = vi
      .fn<typeof globalThis.fetch>()
      .mockRejectedValue(new TypeError('Request cannot be constructed from a URL that includes credentials'));
    const model = createModel({ provider: 'openai', apiKey: 'k', model: 'm' }, fetch);

    const error = await captureRejection(runJobOnModel(createSubmitJob(), model));

    expect(error).toMatchObject({ reason: 'failed' });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('reports a tool that throws a provider refusal as failed', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound([buildToolCall('c1', 'check', { draft: 'a' })])] });
    const refusal = new APICallError({ message: 'revoked', url: 'u', requestBodyValues: {}, statusCode: 401 });

    const error = await captureRejection(
      runJobOnModel(
        createSubmitJob({
          check: () => {
            throw refusal;
          },
        }),
        model,
      ),
    );

    expect(error).toMatchObject({ reason: 'failed', cause: refusal });
  });

  it('reports a TypeError that onEvent throws as failed', async () => {
    const model = new MockLanguageModelV4({ doStream: [buildRound([buildToolCall('c1', 'check', { draft: 'a' })])] });

    const error = await captureRejection(
      runJobOnModel(createSubmitJob(), model, {
        onEvent: () => {
          throw new TypeError('Failed to fetch');
        },
      }),
    );

    expect(error).toMatchObject({ reason: 'failed' });
  });
});
