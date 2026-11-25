/**
 * Checks a provider's response for a refused key: a 401 or 403, or Gemini's 400 whose body names an invalid key.
 *
 * @internal
 */
export function isRefusedCredential(status: number, body: string | undefined): boolean {
  if (status === 401 || status === 403) return true;
  return status === 400 && body?.includes('API_KEY_INVALID') === true;
}
