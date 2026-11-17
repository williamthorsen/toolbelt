import { describe, expect, it } from 'vitest';

import { JobRefusedError } from '../JobRefusedError.ts';

describe(JobRefusedError, () => {
  it('keeps the refusal and its message', () => {
    const error = new JobRefusedError({
      status: 429,
      reason: 'limit-reached',
      message: 'The job limit "per-ip" is reached.',
      limit: 'per-ip',
    });

    expect(error.name).toBe('JobRefusedError');
    expect(error).toMatchObject({ status: 429, reason: 'limit-reached', limit: 'per-ip' });
    expect(error.message).toBe('The job limit "per-ip" is reached.');
  });

  it('omits a limit that the refusal does not name', () => {
    const error = new JobRefusedError({ status: 413, reason: 'input-too-long', message: 'Too long.' });

    expect(error).not.toHaveProperty('limit');
  });
});
