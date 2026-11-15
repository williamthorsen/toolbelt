import { describe, expect, it } from 'vitest';

import { SecretStoreError } from '../SecretStoreError.ts';

describe(SecretStoreError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new SecretStoreError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'SecretStoreError' });
  });
});
