const LINE_BREAK_PATTERN = /[\n\r]/;

/**
 * Rejects a secret that `security` cannot store faithfully. Its prompt reads one line, so a secret carrying a
 * line break would be stored truncated at the first one with nothing reported, and an empty secret would be
 * stored as an item indistinguishable from a stray one.
 *
 * @internal
 */
export function assertStorableSecret(secret: string): void {
  if (secret === '') throw new Error('The secret is empty.');

  if (LINE_BREAK_PATTERN.test(secret)) {
    throw new Error('The secret carries a line break. `security` reads one line, so only the first would be stored.');
  }
}
