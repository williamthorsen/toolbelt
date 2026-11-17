import { generateText } from 'ai';
import { describe, expect, it } from 'vitest';

import type { ProviderConnection } from '../../types/job.ts';
import { createModel } from '../createModel.ts';

describe(createModel, () => {
  it.each([
    {
      connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'key-a' },
      host: 'api.anthropic.com',
      header: ['x-api-key', 'key-a'],
    },
    {
      connection: { provider: 'google', model: 'gemini-3-flash', apiKey: 'key-g' },
      host: 'generativelanguage.googleapis.com',
      header: ['x-goog-api-key', 'key-g'],
    },
    {
      connection: { provider: 'openai', model: 'gpt-6-mini', apiKey: 'key-o' },
      host: 'api.openai.com',
      header: ['authorization', 'Bearer key-o'],
    },
    {
      connection: { provider: 'openrouter', model: 'anthropic/claude-haiku-5-5', apiKey: 'key-r' },
      host: 'openrouter.ai',
      header: ['authorization', 'Bearer key-r'],
    },
  ] satisfies { connection: ProviderConnection; host: string; header: [string, string] }[])(
    'sends a $connection.provider request to its host with its credential',
    async ({ connection, host, header }) => {
      const request = await captureRequest(connection);

      expect(request.url.host).toBe(host);
      expect(request.headers.get(header[0])).toBe(header[1]);
    },
  );

  it('sends the browser header to Anthropic, and the OAuth beta only with a bearer token', async () => {
    const withKey = await captureRequest({ provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'key-a' });
    const withToken = await captureRequest({ provider: 'anthropic', model: 'claude-haiku-5-5', authToken: 'tok' });

    expect(withKey.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(withKey.headers.get('anthropic-beta')).toBeNull();
    expect(withToken.headers.get('anthropic-dangerous-direct-browser-access')).toBe('true');
    expect(withToken.headers.get('anthropic-beta')).toBe('oauth-2025-04-20');
    expect(withToken.headers.get('authorization')).toBe('Bearer tok');
  });

  it("lets the connection's headers override the runner's Anthropic headers", async () => {
    const request = await captureRequest({
      provider: 'anthropic',
      model: 'claude-haiku-5-5',
      authToken: 'tok',
      headers: { 'anthropic-beta': 'custom', 'anthropic-dangerous-direct-browser-access': 'false' },
    });

    expect(request.headers.get('anthropic-beta')).toBe('custom');
    expect(request.headers.get('anthropic-dangerous-direct-browser-access')).toBe('false');
  });

  it("adds the connection's headers for every provider", async () => {
    const request = await captureRequest({
      provider: 'openrouter',
      model: 'anthropic/claude-haiku-5-5',
      apiKey: 'key-r',
      headers: { 'x-title': 'App' },
    });

    expect(request.headers.get('x-title')).toBe('App');
  });
});

// region | Helpers
/** Makes one request through the connection's model and returns it, failing the request once it is recorded. */
async function captureRequest(connection: ProviderConnection): Promise<{ url: URL; headers: Headers }> {
  let captured: { url: URL; headers: Headers } | undefined;
  const fetch: typeof globalThis.fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input.toString();
    captured = { url: new URL(url), headers: new Headers(init?.headers) };
    return Promise.reject(new Error('request captured'));
  };

  await expect(generateText({ model: createModel(connection, fetch), prompt: 'Hi', maxRetries: 0 })).rejects.toThrow(
    'request captured',
  );
  if (captured === undefined) throw new Error('The model did not make a request.');
  return captured;
}
// endregion | Helpers
