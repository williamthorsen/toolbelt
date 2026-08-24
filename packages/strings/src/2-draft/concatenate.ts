/**
 * Joins strings into an English-style list: a pair takes `dualSeparator`, and three or more take
 * `separator` between all but the last two and `finalSeparator` before the last.
 * @category String
 * @experimental
 * @stage draft
 */
export function concatenate(strings: string[], options: Options = {}): string {
  const { dualSeparator = ' and ', finalSeparator = ', and ', separator = ', ' } = options;

  const [firstString] = strings;
  if (!firstString) return '';
  if (strings.length === 1) return firstString;
  if (strings.length === 2) return `${firstString}${dualSeparator}${strings[1]}`;

  const last = strings.pop();
  return `${strings.join(separator)}${finalSeparator}${last}`;
}

interface Options {
  dualSeparator?: string | undefined;
  separator?: string | undefined;
  finalSeparator?: string | undefined;
}
