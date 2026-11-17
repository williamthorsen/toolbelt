import { assertPositiveInteger } from '../internal/assertPositiveInteger.ts';
import type { JobCount, UpstashJobCounterOptions } from '../types/endpoint.ts';

const DEFAULT_KEY_PREFIX = 'llm-jobs';
// Two days outlive the UTC day that a key names, wherever in the day it is created.
const KEY_TTL_SECONDS = '172800';
const TIMEOUT_MS = 5000;

/**
 * Creates a `countJob` for `createJobHandler` that counts each job in Upstash Redis against a per-IP limit and a global
 * cap, both over the current UTC day. A job over the per-IP limit is refused as `per-ip-daily` without counting
 * against the global cap; one over the global cap is refused as `global-daily`. A refused job stays counted, and so
 * does a job that later fails. The counter throws, so that the handler refuses the job as unavailable, when the
 * request has no caller IP, or when Upstash fails, does not answer within 5 seconds, or answers with an error or an
 * unexpected body. Throws a `RangeError` when `perIpLimit` or `globalDailyLimit` is not a positive integer.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export function createUpstashJobCounter(options: UpstashJobCounterOptions): (request: Request) => Promise<JobCount> {
  assertPositiveInteger(options.perIpLimit, 'perIpLimit');
  assertPositiveInteger(options.globalDailyLimit, 'globalDailyLimit');
  const keyPrefix = options.keyPrefix ?? DEFAULT_KEY_PREFIX;

  return async (request) => {
    const ip = options.readCallerIp(request);
    if (ip === undefined || ip === '') throw new Error('The request does not have a caller IP.');
    const day = new Date().toISOString().slice(0, 10);

    if ((await countKey(options, `${keyPrefix}:ip:${day}:${ip}`)) > options.perIpLimit) {
      return { allowed: false, limit: 'per-ip-daily' };
    }
    if ((await countKey(options, `${keyPrefix}:global:${day}`)) > options.globalDailyLimit) {
      return { allowed: false, limit: 'global-daily' };
    }
    return { allowed: true };
  };
}

// region | Helpers
/** Increments a key, setting its expiry when it has none, and returns the key's new count. */
async function countKey(options: UpstashJobCounterOptions, key: string): Promise<number> {
  const response = await fetch(`${options.url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${options.token}`, 'content-type': 'application/json' },
    body: JSON.stringify([
      ['INCR', key],
      ['EXPIRE', key, KEY_TTL_SECONDS, 'NX'],
    ]),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Upstash answered ${response.status}.`);
  return readCount(await response.json());
}

/** Returns the `INCR` result of a two-command pipeline response. Throws on an error entry or an unexpected shape. */
function readCount(body: unknown): number {
  if (!Array.isArray(body) || body.length !== 2) {
    throw new Error('Upstash answered the pipeline with an unexpected body.');
  }
  const entries: readonly unknown[] = body;
  for (const entry of entries) {
    if (typeof entry === 'object' && entry !== null && 'error' in entry) {
      throw new Error(`Upstash answered with an error: ${String(entry.error)}`);
    }
  }
  const [increment] = entries;
  if (typeof increment !== 'object' || increment === null || !('result' in increment)) {
    throw new Error('Upstash answered the pipeline without a count.');
  }
  if (typeof increment.result !== 'number') throw new TypeError('Upstash answered the pipeline without a count.');
  return increment.result;
}
// endregion | Helpers
