import type { TurnstileVerifierOptions } from '../types/endpoint.ts';

const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const DEFAULT_HEADER = 'cf-turnstile-response';
const TIMEOUT_MS = 5000;
/** The siteverify error codes that report the operator's configuration or siteverify itself, not the caller. */
const UNAVAILABLE_ERROR_CODES = new Set([
  'bad-request',
  'internal-error',
  'invalid-input-secret',
  'missing-input-secret',
]);

/**
 * Creates a `checkBot` for `createJobHandler` that verifies the request's Cloudflare Turnstile token with siteverify.
 * It returns `false` for a request without a token, for a token that siteverify rejects, and for one issued on another
 * hostname or for another action than the options expect. It throws when siteverify fails, does not answer within 5
 * seconds, answers with an unexpected body, or reports a missing or invalid secret, a bad request, or its own internal
 * error, so that the handler refuses the job as unavailable and reports the error to `onError`.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export function createTurnstileVerifier(options: TurnstileVerifierOptions): (request: Request) => Promise<boolean> {
  const header = options.header ?? DEFAULT_HEADER;
  return async (request) => {
    const token = request.headers.get(header);
    if (token === null || token === '') return false;

    const response = await fetch(SITEVERIFY_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ secret: options.secretKey, response: token }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Turnstile siteverify answered ${response.status}.`);
    const result = readSiteverifyResult(await response.json());

    return (
      result.success &&
      (options.expectedHostname === undefined || result.hostname === options.expectedHostname) &&
      (options.expectedAction === undefined || result.action === options.expectedAction)
    );
  };
}

// region | Helpers
interface SiteverifyResult {
  readonly success: boolean;
  readonly hostname: unknown;
  readonly action: unknown;
}

/**
 * Returns the fields of a siteverify body that the verifier reads. Throws when `success` is not a boolean, or when
 * `error-codes` contains a code that does not concern the caller.
 */
function readSiteverifyResult(body: unknown): SiteverifyResult {
  if (typeof body !== 'object' || body === null || !('success' in body) || typeof body.success !== 'boolean') {
    throw new Error('Turnstile siteverify answered without a boolean `success`.');
  }
  const errorCodes = 'error-codes' in body && Array.isArray(body['error-codes']) ? body['error-codes'] : [];
  const unavailable = errorCodes.filter(
    (code: unknown) => typeof code === 'string' && UNAVAILABLE_ERROR_CODES.has(code),
  );
  if (unavailable.length > 0) {
    throw new Error(`Turnstile siteverify answered with ${unavailable.join(', ')}.`);
  }
  return {
    success: body.success,
    hostname: 'hostname' in body ? body.hostname : undefined,
    action: 'action' in body ? body.action : undefined,
  };
}
// endregion | Helpers
