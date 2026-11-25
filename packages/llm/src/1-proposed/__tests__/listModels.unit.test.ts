import { describe, expect, it, vi } from 'vitest';

import { captureRejection } from '../../test-utils/captureRejection.ts';
import type { UserCredential } from '../../types/credential.ts';
import { listModels } from '../listModels.ts';

const ANTHROPIC: UserCredential = { provider: 'anthropic', apiKey: 'sk-ant' };
const GOOGLE: UserCredential = { provider: 'google', apiKey: 'AIza' };
const OPENAI: UserCredential = { provider: 'openai', apiKey: 'sk-oai' };
const OPENROUTER: UserCredential = { provider: 'openrouter', apiKey: 'sk-or' };

describe(listModels, () => {
  it('lists Anthropic models across pages with their display names', async () => {
    const fetch = fakeFetch(
      Response.json({ data: [{ id: 'claude-a', display_name: 'Claude A' }], has_more: true, last_id: 'claude-a' }),
      Response.json({ data: [{ id: 'claude-b', display_name: 'Claude B' }], has_more: false, last_id: 'claude-b' }),
    );

    const listing = await listModels(ANTHROPIC, { signal: new AbortController().signal, fetch });

    expect(listing).toStrictEqual({
      status: 'listed',
      models: [
        { id: 'claude-a', label: 'Claude A' },
        { id: 'claude-b', label: 'Claude B' },
      ],
    });
    const [first, second] = readRequests(fetch);
    expect(first?.url).toBe('https://api.anthropic.com/v1/models?limit=1000');
    expect(second?.url).toBe('https://api.anthropic.com/v1/models?limit=1000&after_id=claude-a');
    expect(first?.headers.get('x-api-key')).toBe('sk-ant');
    expect(first?.headers.get('anthropic-version')).toBe('2023-06-01');
    expect(first?.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
  });

  it('lists only the Google models that generate content, across pages, without the models/ prefix', async () => {
    const fetch = fakeFetch(
      Response.json({
        models: [
          { name: 'models/gemini-a', displayName: 'Gemini A', supportedGenerationMethods: ['generateContent'] },
          { name: 'models/embedding-a', displayName: 'Embedding', supportedGenerationMethods: ['embedContent'] },
          { name: 'models/no-methods', displayName: 'No methods' },
        ],
        nextPageToken: 'page-2',
      }),
      Response.json({
        models: [{ name: 'models/gemini-b', supportedGenerationMethods: ['countTokens', 'generateContent'] }],
      }),
    );

    const listing = await listModels(GOOGLE, { signal: new AbortController().signal, fetch });

    expect(listing).toStrictEqual({
      status: 'listed',
      models: [
        { id: 'gemini-a', label: 'Gemini A' },
        { id: 'gemini-b', label: 'gemini-b' },
      ],
    });
    const [first, second] = readRequests(fetch);
    expect(first?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000');
    expect(second?.url).toBe('https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000&pageToken=page-2');
    expect(first?.headers.get('x-goog-api-key')).toBe('AIza');
  });

  it('lists every OpenAI model, labelled by its id', async () => {
    const fetch = fakeFetch(Response.json({ data: [{ id: 'gpt-a' }, { id: 'text-embedding-a' }, { object: 'x' }] }));

    const listing = await listModels(OPENAI, { signal: new AbortController().signal, fetch });

    expect(listing).toStrictEqual({
      status: 'listed',
      models: [
        { id: 'gpt-a', label: 'gpt-a' },
        { id: 'text-embedding-a', label: 'text-embedding-a' },
      ],
    });
    const [request] = readRequests(fetch);
    expect(request?.url).toBe('https://api.openai.com/v1/models');
    expect(request?.headers.get('authorization')).toBe('Bearer sk-oai');
  });

  it('lists OpenRouter models with their names, without sending the key', async () => {
    const fetch = fakeFetch(Response.json({ data: [{ id: 'openai/gpt-a', name: 'OpenAI: GPT A' }] }));

    const listing = await listModels(OPENROUTER, { signal: new AbortController().signal, fetch });

    expect(listing).toStrictEqual({ status: 'listed', models: [{ id: 'openai/gpt-a', label: 'OpenAI: GPT A' }] });
    const [request] = readRequests(fetch);
    expect(request?.url).toBe('https://openrouter.ai/api/v1/models');
    expect([...(request?.headers.keys() ?? [])]).toStrictEqual([]);
  });

  it('lists an id that a later page repeats once', async () => {
    const fetch = fakeFetch(
      Response.json({ data: [{ id: 'claude-a' }], has_more: true, last_id: 'claude-a' }),
      Response.json({ data: [{ id: 'claude-a' }, { id: 'claude-b' }], has_more: false }),
    );

    const listing = await listModels(ANTHROPIC, { signal: new AbortController().signal, fetch });

    expect(listing).toStrictEqual({
      status: 'listed',
      models: [
        { id: 'claude-a', label: 'claude-a' },
        { id: 'claude-b', label: 'claude-b' },
      ],
    });
  });

  it.each([
    ['Anthropic 401', ANTHROPIC, 401, { error: { type: 'authentication_error' } }],
    ['OpenAI 403', OPENAI, 403, { error: { message: 'forbidden' } }],
    [
      "Google's invalid-key 400",
      GOOGLE,
      400,
      { error: { code: 400, status: 'INVALID_ARGUMENT', details: [{ reason: 'API_KEY_INVALID' }] } },
    ],
  ])('resolves an %s as refused', async (_label, credential, status, body) => {
    const fetch = fakeFetch(Response.json(body, { status }));

    await expect(listModels(credential, { signal: new AbortController().signal, fetch })).resolves.toStrictEqual({
      status: 'refused',
    });
  });

  it('resolves a refusal on a later page as refused', async () => {
    const fetch = fakeFetch(
      Response.json({ data: [{ id: 'claude-a' }], has_more: true, last_id: 'claude-a' }),
      Response.json({}, { status: 401 }),
    );

    await expect(listModels(ANTHROPIC, { signal: new AbortController().signal, fetch })).resolves.toStrictEqual({
      status: 'refused',
    });
  });

  it.each([
    [
      'an OpenRouter 401, since the key was not sent',
      OPENROUTER,
      [Response.json({}, { status: 401 })],
      'OpenRouter responded with 401.',
    ],
    [
      "Google's 400 that does not name the key",
      GOOGLE,
      [Response.json({}, { status: 400 })],
      'Google responded with 400.',
    ],
    ['a 500', OPENAI, [new Response('oops', { status: 500 })], 'OpenAI responded with 500.'],
    [
      'a body that is not JSON',
      OPENAI,
      [new Response('<html>')],
      'OpenAI returned a model list that could not be read.',
    ],
    [
      'a body without the list',
      GOOGLE,
      [Response.json({ items: [] })],
      'Google returned a model list that could not be read.',
    ],
    [
      'more pages without a next id',
      ANTHROPIC,
      [Response.json({ data: [], has_more: true })],
      'Anthropic returned a model list that could not be read.',
    ],
    [
      'a repeated page token',
      GOOGLE,
      [Response.json({ models: [], nextPageToken: 't' }), Response.json({ models: [], nextPageToken: 't' })],
      'Google returned more pages than expected.',
    ],
  ])('resolves %s as unavailable', async (_label, credential, responses, reason) => {
    const fetch = fakeFetch(...responses);

    await expect(listModels(credential, { signal: new AbortController().signal, fetch })).resolves.toStrictEqual({
      status: 'unavailable',
      reason,
    });
  });

  it('resolves as unavailable after the page cap', async () => {
    let page = 0;
    const fetch = vi.fn<typeof globalThis.fetch>(() => {
      page += 1;
      return Promise.resolve(Response.json({ models: [], nextPageToken: `t${page}` }));
    });

    await expect(listModels(GOOGLE, { signal: new AbortController().signal, fetch })).resolves.toStrictEqual({
      status: 'unavailable',
      reason: 'Google returned more pages than expected.',
    });
    expect(fetch).toHaveBeenCalledTimes(20);
  });

  it('resolves a request that fails as unavailable with the cause', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(listModels(OPENAI, { signal: new AbortController().signal, fetch })).resolves.toStrictEqual({
      status: 'unavailable',
      reason: 'OpenAI could not be reached: Failed to fetch',
    });
  });

  it('rejects with the reason of a signal aborted before the request, without requesting', async () => {
    const controller = new AbortController();
    controller.abort(new Error('cancelled'));
    const fetch = vi.fn<typeof globalThis.fetch>();

    const error = await captureRejection(listModels(OPENAI, { signal: controller.signal, fetch }));

    expect(error).toStrictEqual(new Error('cancelled'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('passes the signal to fetch and rejects with its reason when the request aborts', async () => {
    const controller = new AbortController();
    const fetch = vi.fn<typeof globalThis.fetch>(() => {
      controller.abort(new Error('cancelled'));
      return Promise.reject(new Error('The operation was aborted.'));
    });

    const error = await captureRejection(listModels(OPENAI, { signal: controller.signal, fetch }));

    expect(error).toStrictEqual(new Error('cancelled'));
    expect(readRequests(fetch)[0]?.signal).toBe(controller.signal);
  });

  it('rejects when the signal aborts between pages', async () => {
    const controller = new AbortController();
    const fetch = vi.fn<typeof globalThis.fetch>(() => {
      controller.abort(new Error('cancelled'));
      return Promise.resolve(Response.json({ data: [{ id: 'claude-a' }], has_more: true, last_id: 'claude-a' }));
    });

    const error = await captureRejection(listModels(ANTHROPIC, { signal: controller.signal, fetch }));

    expect(error).toStrictEqual(new Error('cancelled'));
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('rejects when the signal aborts while the body is read', async () => {
    const controller = new AbortController();
    const body = new ReadableStream({
      pull: (streamController) => {
        controller.abort(new Error('cancelled'));
        streamController.error(new DOMException('aborted', 'AbortError'));
      },
    });
    const fetch = fakeFetch(new Response(body));

    const error = await captureRejection(listModels(OPENAI, { signal: controller.signal, fetch }));

    expect(error).toStrictEqual(new Error('cancelled'));
  });
});

// region | Helpers
/** Returns a `fetch` that resolves with the responses in order. */
function fakeFetch(...responses: Response[]) {
  const fetch = vi.fn<typeof globalThis.fetch>();
  for (const response of responses) fetch.mockResolvedValueOnce(response);
  return fetch;
}

/** Lists the URL, headers, and signal of each request that a fake `fetch` received. */
function readRequests(fetch: ReturnType<typeof vi.fn<typeof globalThis.fetch>>) {
  return fetch.mock.calls.map(([url, init]) => ({
    url: readUrl(url),
    headers: new Headers(init?.headers),
    signal: init?.signal,
  }));
}

/** Returns the URL of a `fetch` input. */
function readUrl(input: Parameters<typeof globalThis.fetch>[0] | undefined): string | undefined {
  if (input === undefined || typeof input === 'string') return input;
  return input instanceof URL ? input.href : input.url;
}
// endregion | Helpers
