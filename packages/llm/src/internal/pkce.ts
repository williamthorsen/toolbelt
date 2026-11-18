/**
 * Returns a random token of `byteCount` bytes, encoded as base64url.
 *
 * @internal
 */
export function createRandomToken(byteCount: number): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(byteCount)));
}

/**
 * Derives the S256 code challenge of a PKCE code verifier (RFC 7636, section 4.2).
 *
 * @internal
 */
export async function deriveCodeChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return encodeBase64Url(new Uint8Array(digest));
}

// region | Helpers
/** Encodes bytes as base64url without padding. */
function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCodePoint(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/, '');
}
// endregion | Helpers
