/* eslint unicorn/no-useless-undefined: off */

export const END_OF_LINE = '\n';

/**
 * Convenience tag function to allow use of multi-line template strings in tests.
 * Removes the indent from each line, discards the first and last lines, and returns the result.
 */
export function unindent(templateStrings: TemplateStringsArray, ...values: unknown[]): string {
  let fullString = '';
  for (const [index, templateString] of templateStrings.entries()) {
    // FIXME: Guard against values that cannot safely be coerced to strings.
    // eslint-disable-next-line @typescript-eslint/no-base-to-string,@typescript-eslint/restrict-plus-operands
    fullString += templateString + (values[index] ?? '');
  }

  const lines = fullString.split(END_OF_LINE);

  if (lines[0]?.trim() !== '') {
    throw new Error('The first line of the template string must be empty.');
  }

  const lastLineIsEmpty = lines.at(-1)?.trim() === '';
  const linesToDeindent = lines.slice(1, lastLineIsEmpty ? -1 : undefined);

  let minimumIndent: number | undefined;

  for (const line of linesToDeindent) {
    if (!line) continue;
    const leadingSpaces = countLeadingSpaces(line);
    minimumIndent = minimumIndent === undefined ? leadingSpaces : Math.min(minimumIndent, leadingSpaces);
  }

  const indent = minimumIndent ?? 0;
  return linesToDeindent.map((line) => line.slice(indent)).join(END_OF_LINE);
}

function countLeadingSpaces(str: string): number {
  return str.search(/\S|$/);
}
