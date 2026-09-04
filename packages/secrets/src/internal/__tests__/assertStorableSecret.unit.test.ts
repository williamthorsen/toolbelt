import { describe, expect, it } from 'vitest';

import { assertStorableSecret } from '../assertStorableSecret.ts';

describe(assertStorableSecret, () => {
  it('accepts a secret `security` stores faithfully', () => {
    expect(() => assertStorableSecret('ATATT3xFfGF0-abc_123')).not.toThrow();
  });

  it('rejects the empty secret', () => {
    expect(() => assertStorableSecret('')).toThrow(/empty/);
  });

  it.each([['a\nb'], ['a\rb'], ['trailing\n']])('accepts a secret carrying a line break: %j', (secret) => {
    expect(() => assertStorableSecret(secret)).not.toThrow();
  });
});
