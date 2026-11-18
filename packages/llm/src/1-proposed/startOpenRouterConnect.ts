import { savePendingConnect } from '../internal/openRouterConnectState.ts';
import { createRandomToken, deriveCodeChallenge } from '../internal/pkce.ts';
import { readGlobalStorage } from '../internal/readGlobalStorage.ts';
import type { OpenRouterConnectOptions } from '../types/openrouter.ts';

const AUTH_URL = 'https://openrouter.ai/auth';

/**
 * Starts OpenRouter's PKCE connect flow and returns the URL of OpenRouter's approval page, to which the app sends the
 * user. It keeps the flow's code verifier and `state` in `sessionStorage` until `completeOpenRouterConnect` reads them
 * on the callback page; starting another flow replaces them. Each approval issues a new key on the user's account.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export async function startOpenRouterConnect(options: OpenRouterConnectOptions): Promise<URL> {
  const verifier = createRandomToken(32);
  const state = createRandomToken(16);
  savePendingConnect(options.sessionStorage ?? readGlobalStorage('sessionStorage'), { verifier, state });

  const url = new URL(AUTH_URL);
  url.searchParams.set('callback_url', options.callbackUrl);
  url.searchParams.set('code_challenge', await deriveCodeChallenge(verifier));
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('state', state);
  if (options.limit !== undefined) url.searchParams.set('limit', String(options.limit));
  if (options.expiration !== undefined) url.searchParams.set('expiration', options.expiration);
  if (options.keyLabel !== undefined) url.searchParams.set('key_label', options.keyLabel);
  return url;
}
