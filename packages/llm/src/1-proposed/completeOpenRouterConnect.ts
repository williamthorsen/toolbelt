import { describeError } from '@williamthorsen/toolbelt.errors';

import { takePendingConnect } from '../internal/openRouterConnectState.ts';
import { readGlobalStorage } from '../internal/readGlobalStorage.ts';
import type { UserCredential } from '../types/credential.ts';
import type { OpenRouterCallbackOptions } from '../types/openrouter.ts';
import { OpenRouterConnectError } from './OpenRouterConnectError.ts';

const KEYS_URL = 'https://openrouter.ai/api/v1/auth/keys';

/**
 * Completes OpenRouter's connect flow on the callback page and returns the credential of the key that OpenRouter
 * issued. Returns `undefined` when `url` has none of the callback's `code`, `error`, or `state` parameters, so the app
 * can call it on every load. Rejects with `OpenRouterConnectError` when the user did not approve, when the callback's
 * `state` does not match the flow that `startOpenRouterConnect` started in this tab, or when the key exchange fails.
 * It does not store the key or change the page's address.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export async function completeOpenRouterConnect(
  url: string | URL,
  options: OpenRouterCallbackOptions = {},
): Promise<UserCredential | undefined> {
  const params = new URL(url).searchParams;
  const code = params.get('code');
  const state = params.get('state');
  if (code === null && state === null && params.get('error') === null) return undefined;

  if (code === null) throw new OpenRouterConnectError('The user did not approve the connection.');
  const pending = takePendingConnect(options.sessionStorage ?? readGlobalStorage('sessionStorage'));
  if (pending === undefined || state !== pending.state) {
    throw new OpenRouterConnectError('The callback does not match the connection that this tab started.');
  }

  const fetch = options.fetch ?? globalThis.fetch;
  let response: Response;
  try {
    response = await fetch(KEYS_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code, code_verifier: pending.verifier, code_challenge_method: 'S256' }),
    });
  } catch (error) {
    throw new OpenRouterConnectError(`OpenRouter could not be reached: ${describeError(error)}`, { cause: error });
  }

  const body = await readJson(response);
  if (!response.ok) {
    throw new OpenRouterConnectError(findErrorMessage(body) ?? `OpenRouter responded with ${response.status}.`, {
      status: response.status,
    });
  }
  const key: unknown = typeof body === 'object' && body !== null ? Reflect.get(body, 'key') : undefined;
  if (typeof key !== 'string' || key === '') {
    throw new OpenRouterConnectError('OpenRouter did not return a key.', { status: response.status });
  }
  return { provider: 'openrouter', apiKey: key };
}

// region | Helpers
/** Returns the message of an OpenRouter error body, `{ error: { message } }` or `{ error }`, if it has one. */
function findErrorMessage(body: unknown): string | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const error: unknown = Reflect.get(body, 'error');
  if (typeof error === 'string') return error;
  if (typeof error !== 'object' || error === null) return undefined;
  const message: unknown = Reflect.get(error, 'message');
  return typeof message === 'string' ? message : undefined;
}

/** Returns a response's JSON body, or `undefined` when it does not have one. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}
// endregion | Helpers
