/**
 * Returns the first value that contains something other than whitespace, trimmed. This makes an empty
 * environment variable a miss rather than a credential.
 *
 * @internal
 */
export function findFirstFilled(...values: ReadonlyArray<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed !== undefined && trimmed !== '') return trimmed;
  }

  return undefined;
}
