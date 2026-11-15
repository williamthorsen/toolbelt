import { describe, expect, it } from 'vitest';

import { UnstorableSecretError } from '../UnstorableSecretError.ts';

describe(UnstorableSecretError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new UnstorableSecretError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'UnstorableSecretError' });
  });
});
