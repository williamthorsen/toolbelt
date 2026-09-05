/**
 * Returns the first value carrying something other than whitespace, trimmed. This is what makes an empty
 * environment variable a miss rather than a credential.
 *
 * @internal
 */
export function firstFilled(...values: ReadonlyArray<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed !== undefined && trimmed !== '') return trimmed;
  }

  return undefined;
}
