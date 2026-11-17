import { describe, expect, it } from 'vitest';

import { JobRunError } from '../JobRunError.ts';

describe(JobRunError, () => {
  it('keeps its cause and names it in the message', () => {
    const cause = new Error('rate limited');

    const error = new JobRunError({ cause });

    expect(error.name).toBe('JobRunError');
    expect(error.cause).toBe(cause);
    expect(error.message).toBe('The job failed: rate limited');
  });
});
