import { describe, expect, it, vi } from 'vitest';

import { createTurnstileVerifier } from '../createTurnstileVerifier.ts';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

describe(createTurnstileVerifier, () => {
  it('verifies the token from the default header with the secret key, bounded by a timeout', async () => {
    using fetchSpy = spyOnFetch(() => Response.json({ success: true }));

    const passed = await createTurnstileVerifier({ secretKey: 'secret' })(
      buildRequest({ 'cf-turnstile-response': 'tok' }),
    );

    expect(passed).toBe(true);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe(SITEVERIFY_URL);
    expect(init?.body).toBe(JSON.stringify({ secret: 'secret', response: 'tok' }));
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('reads the token from a configured header', async () => {
    using _fetchSpy = spyOnFetch(() => Response.json({ success: true }));

    const verify = createTurnstileVerifier({ secretKey: 'secret', header: 'x-bot-token' });

    await expect(verify(buildRequest({ 'x-bot-token': 'tok' }))).resolves.toBe(true);
  });

  it.each([
    ['no token header', {}],
    ['an empty token', { 'cf-turnstile-response': '' }],
  ])('fails a request with %s without calling siteverify', async (_label, headers) => {
    using fetchSpy = spyOnFetch(() => Response.json({ success: true }));

    const passed = await createTurnstileVerifier({ secretKey: 'secret' })(buildRequest(headers));

    expect(passed).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fails a token that siteverify rejects', async () => {
    using _fetchSpy = spyOnFetch(() => Response.json({ success: false, 'error-codes': ['invalid-input-response'] }));

    const passed = await createTurnstileVerifier({ secretKey: 'secret' })(
      buildRequest({ 'cf-turnstile-response': 'tok' }),
    );

    expect(passed).toBe(false);
  });

  it.each([
    ['hostname', { expectedHostname: 'app.example' }, { hostname: 'other.example', action: 'job' }],
    ['action', { expectedAction: 'job' }, { hostname: 'app.example', action: 'login' }],
  ])('fails a token issued for another %s', async (_label, expected, issued) => {
    using _fetchSpy = spyOnFetch(() => Response.json({ success: true, ...issued }));

    const verify = createTurnstileVerifier({ secretKey: 'secret', ...expected });

    await expect(verify(buildRequest({ 'cf-turnstile-response': 'tok' }))).resolves.toBe(false);
  });

  it('passes a token issued for the expected hostname and action', async () => {
    using _fetchSpy = spyOnFetch(() => Response.json({ success: true, hostname: 'app.example', action: 'job' }));

    const verify = createTurnstileVerifier({
      secretKey: 'secret',
      expectedHostname: 'app.example',
      expectedAction: 'job',
    });

    await expect(verify(buildRequest({ 'cf-turnstile-response': 'tok' }))).resolves.toBe(true);
  });

  it.each([
    ['a network error', () => Promise.reject(new TypeError('fetch failed')), 'fetch failed'],
    ['a non-2xx status', () => new Response('', { status: 500 }), 'siteverify answered 500'],
    ['a body that is not JSON', () => new Response('<html>'), SyntaxError],
    ['a body without a boolean success', () => Response.json({ success: 'yes' }), 'without a boolean `success`'],
    [
      'a missing or invalid secret',
      () => Response.json({ success: false, 'error-codes': ['invalid-input-secret'] }),
      'invalid-input-secret',
    ],
    [
      'a bad request or an internal error',
      () => Response.json({ success: false, 'error-codes': ['bad-request', 'internal-error'] }),
      'bad-request, internal-error',
    ],
  ])('throws on %s', async (_label, respond, expected) => {
    using _fetchSpy = spyOnFetch(respond);

    const verify = createTurnstileVerifier({ secretKey: 'secret' });

    await expect(verify(buildRequest({ 'cf-turnstile-response': 'tok' }))).rejects.toThrow(expected);
  });
});

// region | Helpers
/** Builds a job request with the given headers. */
function buildRequest(headers: Record<string, string>): Request {
  return new Request('https://app.example/api/job', { method: 'POST', headers, body: '{"input":"x"}' });
}

/** Spies on the global `fetch`, answering every call through `respond`. */
function spyOnFetch(respond: () => Response | Promise<Response>) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());
}
// endregion | Helpers
