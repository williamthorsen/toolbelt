import { APICallError, RetryError } from 'ai';
import { describe, expect, it } from 'vitest';

import { JobRunError } from '../JobRunError.ts';

describe(JobRunError, () => {
  it('keeps its cause and names it in the message', () => {
    const cause = new Error('rate limited');

    const error = new JobRunError({ cause });

    expect(error.name).toBe('JobRunError');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('The job failed: rate limited');
    expect(error.reason).toBe('failed');
  });

  it.each([401, 403])('reads a %i from the provider as a refused credential, keeping its message', (statusCode) => {
    const error = new JobRunError({ cause: buildApiCallError({ statusCode, message: 'invalid x-api-key' }) });

    expect(error.reason).toBe('credential-refused');
    expect(error.providerMessage).toBe('invalid x-api-key');
  });

  it("reads Gemini's 400 for an invalid key as a refused credential", () => {
    const cause = buildApiCallError({
      statusCode: 400,
      message: 'API key not valid. Please pass a valid API key.',
      responseBody: JSON.stringify({ error: { code: 400, details: [{ reason: 'API_KEY_INVALID' }] } }),
    });

    expect(new JobRunError({ cause }).reason).toBe('credential-refused');
  });

  it('reads a request without a response as unreachable', () => {
    const error = new JobRunError({ cause: buildApiCallError({ message: 'Cannot connect to API: Failed to fetch' }) });

    expect(error.reason).toBe('unreachable');
    expect(error.providerMessage).toBeUndefined();
  });

  it.each([
    ['another provider status', buildApiCallError({ statusCode: 500, message: 'overloaded' })],
    ['a 400 that does not name the key', buildApiCallError({ statusCode: 400, message: 'bad request' })],
  ])('reads %s as failed', (_label, cause) => {
    expect(new JobRunError({ cause }).reason).toBe('failed');
  });

  it.each([
    ['a refusal', buildApiCallError({ statusCode: 401, message: 'revoked' }), 'credential-refused'],
    ['a missing response', buildApiCallError({ message: 'Cannot connect to API' }), 'unreachable'],
  ])("classifies the last retry's error when it is %s", (_label, lastError, reason) => {
    const cause = new RetryError({
      message: 'Failed after 3 attempts',
      reason: 'maxRetriesExceeded',
      errors: [lastError],
    });

    expect(new JobRunError({ cause }).reason).toBe(reason);
  });

  it('takes a stated reason over the classification', () => {
    const error = new JobRunError({
      cause: buildApiCallError({ statusCode: 401, message: 'from a tool' }),
      reason: 'failed',
    });

    expect(error.reason).toBe('failed');
    expect(error.providerMessage).toBeUndefined();
  });
});

// region | Helpers
/** Builds the AI SDK's error for a provider request. */
function buildApiCallError(fields: { message: string; statusCode?: number; responseBody?: string }): APICallError {
  return new APICallError({ url: 'https://api.example/v1', requestBodyValues: {}, ...fields });
}
// endregion | Helpers
