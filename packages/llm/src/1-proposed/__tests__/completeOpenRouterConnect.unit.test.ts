import { describe, expect, it, vi } from 'vitest';

import { captureRejection } from '../../test-utils/captureRejection.ts';
import { createMemoryStorage } from '../../test-utils/createMemoryStorage.ts';
import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import { completeOpenRouterConnect } from '../completeOpenRouterConnect.ts';
import { OpenRouterConnectError } from '../OpenRouterConnectError.ts';
import { runJob } from '../runJob.ts';
import { startOpenRouterConnect } from '../startOpenRouterConnect.ts';

const CALLBACK_URL = 'https://app.example/connect';
const KEYS_URL = 'https://openrouter.ai/api/v1/auth/keys';

describe(completeOpenRouterConnect, () => {
  it('exchanges the code with the stored verifier and returns the issued key', async () => {
    const { sessionStorage, callback } = await startFlow();
    const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(Response.json({ key: 'sk-or-issued' }));

    const credential = await completeOpenRouterConnect(callback('code-1'), { sessionStorage, fetch });

    expect(credential).toStrictEqual({ provider: 'openrouter', apiKey: 'sk-or-issued' });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(KEYS_URL);
    expect(init?.method).toBe('POST');
    expect(parseJsonBody(init)).toStrictEqual({
      code: 'code-1',
      code_verifier: expect.stringMatching(/^[\w-]{43}$/),
      code_challenge_method: 'S256',
    });
    expect(sessionStorage.entries.size).toBe(0);
  });

  it('issues a credential on which a job runs', async () => {
    const { sessionStorage, callback } = await startFlow();
    const credential = await completeOpenRouterConnect(callback('code-1'), {
      sessionStorage,
      fetch: () => Promise.resolve(Response.json({ key: 'sk-or-issued' })),
    });
    using fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(buildCompletionStream('Hello'));

    const outcome = await runJob(createSubmitJob(), { ...assertDefined(credential), model: 'openai/gpt-5' });

    expect(outcome).toMatchObject({ status: 'unfinished', reason: 'stopped', rounds: 1 });
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(readUrl(url)).toBe('https://openrouter.ai/api/v1/chat/completions');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer sk-or-issued');
  });

  it('returns undefined for a URL that is not a callback, leaving the flow pending', async () => {
    const { sessionStorage } = await startFlow();

    await expect(
      completeOpenRouterConnect('https://app.example/connect?tab=2', { sessionStorage }),
    ).resolves.toBeUndefined();
    expect(sessionStorage.entries.size).toBe(1);
  });

  it('rejects a denial', async () => {
    const { sessionStorage } = await startFlow();

    const error = await captureRejection(
      completeOpenRouterConnect(`${CALLBACK_URL}?error=access_denied`, { sessionStorage }),
    );

    expect(error).toBeInstanceOf(OpenRouterConnectError);
    expect(error).toMatchObject({ message: 'The user did not approve the connection.', status: undefined });
  });

  it.each([
    ['a different state', (state: string) => `${CALLBACK_URL}?code=c&state=${state}x`],
    ['no state', () => `${CALLBACK_URL}?code=c`],
  ])('rejects a callback with %s without calling OpenRouter', async (_label, buildUrl) => {
    const { sessionStorage, state } = await startFlow();
    const fetch = vi.fn<typeof globalThis.fetch>();

    const error = await captureRejection(completeOpenRouterConnect(buildUrl(state), { sessionStorage, fetch }));

    expect(error).toBeInstanceOf(OpenRouterConnectError);
    expect(fetch).not.toHaveBeenCalled();
    expect(sessionStorage.entries.size).toBe(0);
  });

  it('rejects a callback in a tab that did not start a flow', async () => {
    const error = await captureRejection(
      completeOpenRouterConnect(`${CALLBACK_URL}?code=c&state=s`, { sessionStorage: createMemoryStorage() }),
    );

    expect(error).toBeInstanceOf(OpenRouterConnectError);
  });

  it.each([
    ['{ error: { message } }', { error: { message: 'Invalid code' } }, 'Invalid code'],
    ['{ error }', { error: 'Code expired' }, 'Code expired'],
    ['no message', {}, 'OpenRouter responded with 403.'],
  ])("rejects a refused exchange with OpenRouter's status and message, given %s", async (_label, body, message) => {
    const { sessionStorage, callback } = await startFlow();

    const error = await captureRejection(
      completeOpenRouterConnect(callback('c'), {
        sessionStorage,
        fetch: () => Promise.resolve(Response.json(body, { status: 403 })),
      }),
    );

    expect(error).toBeInstanceOf(OpenRouterConnectError);
    expect(error).toMatchObject({ status: 403, message });
  });

  it('rejects an exchange that OpenRouter does not answer', async () => {
    const { sessionStorage, callback } = await startFlow();
    const failure = new TypeError('Failed to fetch');

    const error = await captureRejection(
      completeOpenRouterConnect(callback('c'), { sessionStorage, fetch: () => Promise.reject(failure) }),
    );

    expect(error).toBeInstanceOf(OpenRouterConnectError);
    expect(error).toMatchObject({ status: undefined, cause: failure });
  });

  it('rejects an answer without a key', async () => {
    const { sessionStorage, callback } = await startFlow();

    const error = await captureRejection(
      completeOpenRouterConnect(callback('c'), { sessionStorage, fetch: () => Promise.resolve(Response.json({})) }),
    );

    expect(error).toMatchObject({ message: 'OpenRouter did not return a key.', status: 200 });
  });
});

// region | Helpers
/** Returns the value, failing the test when it is undefined. */
function assertDefined<T>(value: T | undefined): T {
  if (value === undefined) throw new TypeError('The value is undefined.');
  return value;
}

/** Returns a streamed chat completion that answers with `text` and stops. */
function buildCompletionStream(text: string): Response {
  const chunks = [
    { id: 'c', created: 0, model: 'm', choices: [{ index: 0, delta: { role: 'assistant', content: text } }] },
    {
      id: 'c',
      created: 0,
      model: 'm',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
      usage: { prompt_tokens: 4, completion_tokens: 1 },
    },
  ];
  const body = [...chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`), 'data: [DONE]\n\n'].join('');
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

/** Parses a request's string body as JSON, failing the test when the body is not a string. */
function parseJsonBody(init: RequestInit | undefined): unknown {
  if (typeof init?.body !== 'string') throw new TypeError('The request body is not a string.');
  return JSON.parse(init.body);
}

/** Returns the URL that a `fetch` call requested. */
function readUrl(input: Parameters<typeof globalThis.fetch>[0] | undefined): string | undefined {
  return input instanceof Request ? input.url : input?.toString();
}

/** Starts a flow in a fresh storage and returns the storage, the flow's state, and a builder of its callback URL. */
async function startFlow() {
  const sessionStorage = createMemoryStorage();
  const url = await startOpenRouterConnect({ callbackUrl: CALLBACK_URL, sessionStorage });
  const state = url.searchParams.get('state') ?? '';
  return { sessionStorage, state, callback: (code: string) => `${CALLBACK_URL}?code=${code}&state=${state}` };
}
// endregion | Helpers
