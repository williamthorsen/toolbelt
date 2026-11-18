import { describe, expect, it } from 'vitest';

import { deriveCodeChallenge } from '../../internal/pkce.ts';
import { createMemoryStorage } from '../../test-utils/createMemoryStorage.ts';
import { startOpenRouterConnect } from '../startOpenRouterConnect.ts';

const PENDING_KEY = 'toolbelt.llm/openrouter-connect';

describe(startOpenRouterConnect, () => {
  it("returns OpenRouter's approval URL with the challenge of the verifier that it keeps", async () => {
    const sessionStorage = createMemoryStorage();

    const url = await startOpenRouterConnect({ callbackUrl: 'https://app.example/connect', sessionStorage });

    const pending: unknown = JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? '');
    expect(pending).toStrictEqual({ verifier: expect.any(String), state: expect.any(String) });
    const { verifier, state } = readPending(pending);
    expect(url.origin + url.pathname).toBe('https://openrouter.ai/auth');
    expect(Object.fromEntries(url.searchParams)).toStrictEqual({
      callback_url: 'https://app.example/connect',
      code_challenge: await deriveCodeChallenge(verifier),
      code_challenge_method: 'S256',
      state,
    });
  });

  it('passes the key limit, expiry, and label to OpenRouter', async () => {
    const url = await startOpenRouterConnect({
      callbackUrl: 'https://app.example/connect',
      limit: 2.5,
      expiration: '30-days',
      keyLabel: 'Prompt Visualizer',
      sessionStorage: createMemoryStorage(),
    });

    expect(url.searchParams.get('limit')).toBe('2.5');
    expect(url.searchParams.get('expiration')).toBe('30-days');
    expect(url.searchParams.get('key_label')).toBe('Prompt Visualizer');
  });

  it('replaces the secrets of an earlier flow', async () => {
    const sessionStorage = createMemoryStorage();
    const first = await startOpenRouterConnect({ callbackUrl: 'https://app.example/connect', sessionStorage });

    const second = await startOpenRouterConnect({ callbackUrl: 'https://app.example/connect', sessionStorage });

    const { state } = readPending(JSON.parse(sessionStorage.getItem(PENDING_KEY) ?? ''));
    expect(state).toBe(second.searchParams.get('state'));
    expect(state).not.toBe(first.searchParams.get('state'));
  });
});

// region | Helpers
/** Reads the verifier and state from a parsed pending entry, failing the test when either is missing. */
function readPending(value: unknown): { verifier: string; state: string } {
  if (typeof value !== 'object' || value === null) throw new TypeError('The pending entry is not an object.');
  const verifier: unknown = Reflect.get(value, 'verifier');
  const state: unknown = Reflect.get(value, 'state');
  if (typeof verifier !== 'string' || typeof state !== 'string') {
    throw new TypeError('The pending entry is incomplete.');
  }
  return { verifier, state };
}
// endregion | Helpers
