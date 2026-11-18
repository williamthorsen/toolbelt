import { describe, expect, it } from 'vitest';

import { createRandomToken, deriveCodeChallenge } from '../pkce.ts';

describe(deriveCodeChallenge, () => {
  it('derives the S256 challenge of the RFC 7636 appendix B verifier', async () => {
    await expect(deriveCodeChallenge('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).resolves.toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});

describe(createRandomToken, () => {
  it('encodes the bytes as unpadded base64url', () => {
    const token = createRandomToken(32);

    expect(token).toMatch(/^[\w-]{43}$/);
    expect(createRandomToken(32)).not.toBe(token);
  });
});
