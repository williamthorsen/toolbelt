import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UpstashJobCounterOptions } from '../../types/endpoint.ts';
import { createUpstashJobCounter } from '../createUpstashJobCounter.ts';

const OPTIONS: UpstashJobCounterOptions = {
  url: 'https://db.upstash.io',
  token: 'tok',
  readCallerIp: (request) => request.headers.get('x-real-ip') ?? undefined,
  perIpLimit: 2,
  globalDailyLimit: 3,
};

describe(createUpstashJobCounter, () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-17T23:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts jobs under both limits, keyed by IP and UTC day, with an expiry that a later count keeps', async () => {
    using redis = spyOnUpstash();
    const countJob = createUpstashJobCounter(OPTIONS);

    await expect(countJob(buildRequest('1.2.3.4'))).resolves.toStrictEqual({ allowed: true });

    expect(redis.counts).toStrictEqual(
      new Map([
        ['llm-jobs:ip:2026-11-17:1.2.3.4', 1],
        ['llm-jobs:global:2026-11-17', 1],
      ]),
    );
    const [url, init] = redis.spy.mock.calls[0] ?? [];
    expect(url).toBe('https://db.upstash.io/pipeline');
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer tok');
    expect(init?.body).toBe(
      JSON.stringify([
        ['INCR', 'llm-jobs:ip:2026-11-17:1.2.3.4'],
        ['EXPIRE', 'llm-jobs:ip:2026-11-17:1.2.3.4', '172800', 'NX'],
      ]),
    );
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it('refuses an IP over its limit without counting against the global cap', async () => {
    using redis = spyOnUpstash();
    const countJob = createUpstashJobCounter(OPTIONS);

    await countJob(buildRequest('1.2.3.4'));
    await countJob(buildRequest('1.2.3.4'));
    const third = await countJob(buildRequest('1.2.3.4'));

    expect(third).toStrictEqual({ allowed: false, limit: 'per-ip-daily' });
    expect(redis.counts.get('llm-jobs:global:2026-11-17')).toBe(2);
  });

  it('refuses a job over the global cap', async () => {
    using _redis = spyOnUpstash();
    const countJob = createUpstashJobCounter(OPTIONS);

    for (const ip of ['1.1.1.1', '2.2.2.2', '3.3.3.3']) await countJob(buildRequest(ip));

    await expect(countJob(buildRequest('4.4.4.4'))).resolves.toStrictEqual({ allowed: false, limit: 'global-daily' });
  });

  it('starts new counts on the next UTC day', async () => {
    using _redis = spyOnUpstash();
    const countJob = createUpstashJobCounter(OPTIONS);
    await countJob(buildRequest('1.2.3.4'));
    await countJob(buildRequest('1.2.3.4'));

    vi.setSystemTime(new Date('2026-11-18T00:00:01Z'));

    await expect(countJob(buildRequest('1.2.3.4'))).resolves.toStrictEqual({ allowed: true });
  });

  it('prefixes the keys with a configured prefix', async () => {
    using redis = spyOnUpstash();

    await createUpstashJobCounter({ ...OPTIONS, keyPrefix: 'app' })(buildRequest('1.2.3.4'));

    expect(redis.counts.keys().toArray()).toStrictEqual(['app:ip:2026-11-17:1.2.3.4', 'app:global:2026-11-17']);
  });

  it.each([
    ['absent', undefined],
    ['empty', ''],
  ])('throws without calling Upstash when the caller IP is %s', async (_label, ip) => {
    using redis = spyOnUpstash();

    const countJob = createUpstashJobCounter({ ...OPTIONS, readCallerIp: () => ip });

    await expect(countJob(buildRequest('1.2.3.4'))).rejects.toThrow('does not have a caller IP');
    expect(redis.spy).not.toHaveBeenCalled();
  });

  it.each([
    ['a network error', () => Promise.reject(new TypeError('fetch failed')), 'fetch failed'],
    ['a non-2xx status', () => new Response('', { status: 401 }), 'Upstash answered 401'],
    ['an error entry', () => Response.json([{ result: 1 }, { error: 'ERR syntax' }]), 'ERR syntax'],
    ['a response of the wrong length', () => Response.json([{ result: 1 }]), 'unexpected body'],
    ['a count that is not a number', () => Response.json([{ result: '1' }, { result: 1 }]), 'without a count'],
  ])('throws on %s', async (_label, respond, message) => {
    using _fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(async () => respond());

    await expect(createUpstashJobCounter(OPTIONS)(buildRequest('1.2.3.4'))).rejects.toThrow(message);
  });

  it.each([
    ['perIpLimit', { perIpLimit: 0 }],
    ['globalDailyLimit', { globalDailyLimit: 1.5 }],
  ])('throws a RangeError for a %s that is not a positive integer', (_label, override) => {
    expect(() => createUpstashJobCounter({ ...OPTIONS, ...override })).toThrow(RangeError);
  });
});

// region | Helpers
/** Builds a job request from the given IP. */
function buildRequest(ip: string): Request {
  return new Request('https://app.example/api/job', { method: 'POST', headers: { 'x-real-ip': ip } });
}

/** Reports whether a parsed body is a pipeline: an array of commands, each an array of strings. */
function isPipeline(value: unknown): value is string[][] {
  return (
    Array.isArray(value) &&
    value.every(
      (command: unknown) => Array.isArray(command) && command.every((part: unknown) => typeof part === 'string'),
    )
  );
}

/** Spies on the global `fetch`, answering each pipeline from an in-memory map of counters. */
function spyOnUpstash() {
  const counts = new Map<string, number>();
  const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((_url, init) => {
    const commands: unknown = JSON.parse(typeof init?.body === 'string' ? init.body : '[]');
    if (!isPipeline(commands)) throw new TypeError('The body is not a pipeline of commands.');
    const key = commands[0]?.[1] ?? '';
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    return Promise.resolve(Response.json([{ result: count }, { result: 1 }]));
  });
  return { counts, spy, [Symbol.dispose]: () => spy.mockRestore() };
}
// endregion | Helpers
