interface JoinStringsOptions {
  separator?: string;
  lastSeparator?: string;
}

/**
 * Joins an array of strings with a separator, omitting empty values and
 * optionally using a different separatorfor the last element.
 * @category String
 * @experimental
 * @stage candidate
 */
export function joinStrings(
  strings: readonly (string | null | undefined)[],
  { separator = ' ', lastSeparator = separator }: JoinStringsOptions = {},
): string {
  const nonEmptyStrings = strings.filter(isTruthyString);

  if (nonEmptyStrings.length === 0) {
    return '';
  }

  if (lastSeparator === separator || nonEmptyStrings.length === 1) {
    return nonEmptyStrings.join(separator);
  }

  const lastString = nonEmptyStrings.pop();
  return `${nonEmptyStrings.join(separator)}${lastSeparator}${lastString}`;
}

function isTruthyString(value: string | null | undefined): value is string {
  return !!value;
}
