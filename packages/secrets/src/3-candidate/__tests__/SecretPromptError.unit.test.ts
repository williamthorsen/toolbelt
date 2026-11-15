import { describe, expect, it } from 'vitest';

import { SecretPromptError } from '../SecretPromptError.ts';

describe(SecretPromptError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new SecretPromptError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'SecretPromptError' });
  });
});
