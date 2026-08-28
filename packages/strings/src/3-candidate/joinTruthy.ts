/**
 * Joins an array of strings with a separator, dropping members that are `''`, null, or undefined.
 * A whitespace-only member is kept.
 * @category String
 * @experimental
 * @stage candidate
 */
export function joinTruthy(strings: readonly (string | null | undefined)[], options: JoinTruthyOptions = {}): string {
  const { separator = ' ' } = options;

  return strings.filter(isTruthyString).join(separator);
}

interface JoinTruthyOptions {
  separator?: string | undefined;
}

// region | Helpers

function isTruthyString(value: string | null | undefined): value is string {
  return !!value;
}

// endregion | Helpers
