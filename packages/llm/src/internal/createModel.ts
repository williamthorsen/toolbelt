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
export function createModel(connection: ProviderConnection, fetch?: typeof globalThis.fetch): LanguageModel {
  const headers = { ...connection.headers };
  switch (connection.provider) {
    case 'anthropic':
      return createAnthropic({
        ...buildAnthropicCredential(connection),
        headers: { ...buildAnthropicHeaders(connection), ...headers },
        ...(fetch && { fetch }),
      })(connection.model);
    case 'google':
      return createGoogle({ apiKey: connection.apiKey, headers, ...(fetch && { fetch }) })(connection.model);
    case 'openai':
      return createOpenAI({ apiKey: connection.apiKey, headers, ...(fetch && { fetch }) })(connection.model);
    case 'openrouter':
      return createOpenAICompatible({
        name: 'openrouter',
        baseURL: OPENROUTER_BASE_URL,
        apiKey: connection.apiKey,
        headers,
        includeUsage: true,
        ...(fetch && { fetch }),
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
// endregion | Helpers
