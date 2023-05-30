export const END_OF_LINE = '\n';

/**
 * Convenience function to allow use of multi-line template strings in tests.
 * Removes the indent from each line, discards the first and last lines, and returns the result.
 */
export function unindent(templateStrings: TemplateStringsArray, ...values: unknown[]): string {
  let fullString = '';
  templateStrings.forEach((templateString, i) => {
    fullString += templateString + (values[i] ?? '');
  });

  const lines = fullString.split(END_OF_LINE);

  if (lines[0]?.trim() !== '') {
    throw new Error('The first line of the template string must be empty.');
  }

  const lastLineIsEmpty = lines[lines.length - 1]?.trim() === '';
  const linesToDeindent = lines.slice(1, lastLineIsEmpty ? -1 : undefined);

  console.info('linesToIndent:', linesToDeindent);

  const minimumIndent = linesToDeindent.reduce((indentSize, line) => {
    if (!line) {
      return indentSize;
    }
    if (indentSize === undefined) {
      return countLeadingSpaces(line);
    }
    return Math.min(indentSize, countLeadingSpaces(line));
  }, undefined as number | undefined) || 0;

  return linesToDeindent.map(line => line.slice(minimumIndent)).join(END_OF_LINE);
}

function countLeadingSpaces(str: string): number {
  return str.search(/\S|$/);
}
