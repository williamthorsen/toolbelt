import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';

import type { AnthropicConnection, ProviderConnection } from '../types/job.ts';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

/**
 * Builds the language model that a connection names. `fetch` replaces the global one for every request that the
 * model makes.
 *
 * @internal
 */
export function createModel(connection: ProviderConnection, baseFetch?: typeof globalThis.fetch): LanguageModel {
  const headers = { ...connection.headers };
  const fetch = wrapFetch(baseFetch);
  switch (connection.provider) {
    case 'anthropic':
      return createAnthropic({
        ...buildAnthropicCredential(connection),
        headers: { ...buildAnthropicHeaders(connection), ...headers },
        fetch,
      })(connection.model);
    case 'google':
      return createGoogle({ apiKey: connection.apiKey, headers, fetch })(connection.model);
    case 'openai':
      return createOpenAI({ apiKey: connection.apiKey, headers, fetch })(connection.model);
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        baseURL: OPENROUTER_BASE_URL,
        apiKey: connection.apiKey,
        headers,
        includeUsage: true,
        fetch,
      })(connection.model);
  }
}

// region | Helpers
/** Picks the credential option that an Anthropic connection supplies. */
function buildAnthropicCredential(connection: AnthropicConnection): { apiKey: string } | { authToken: string } {
  return connection.authToken === undefined ? { apiKey: connection.apiKey } : { authToken: connection.authToken };
}

/** Returns the headers that the runner sends to Anthropic before the connection's own. */
function buildAnthropicHeaders(connection: AnthropicConnection): Record<string, string> {
  return {
    'anthropic-dangerous-direct-browser-access': 'true',
    // A bearer token from a provider CLI login is an OAuth token, which the API accepts only with this beta.
    ...(connection.authToken !== undefined && { 'anthropic-beta': 'oauth-2025-04-20' }),
  };
}

/**
 * Wraps `fetch` so that a network failure without a `cause`, which is how a browser reports a blocked or failed
 * request, reaches the AI SDK as the `fetch failed` error that it retries and reports as a request without a status.
 */
function wrapFetch(baseFetch: typeof globalThis.fetch | undefined): typeof globalThis.fetch {
  return async (input, init) => {
    try {
      return await (baseFetch ?? globalThis.fetch)(input, init);
    } catch (error) {
      if (error instanceof TypeError && error.cause === undefined)
        throw new TypeError('fetch failed', { cause: error });
      throw error;
    }
  };
}
// endregion | Helpers
