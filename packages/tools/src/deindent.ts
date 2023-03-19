import { END_OF_LINE } from './core.constants.js';

/**
 * Convenience function to allow use of multi-line template strings in tests.
 * Removes the indent from each line, discards the first and last lines, and returns the result.
 */
export function deindent(templateStrings: TemplateStringsArray): string {
  const lines = templateStrings.join('').split(END_OF_LINE);

  if (lines.length === 0) {
    return '';
  }

  if (lines[0].trim() !== '') {
    throw new Error('The first line of the template string must be empty.');
  }

  const lastLineIsEmpty = lines[lines.length - 1].trim() === '';
  const linesToDeindent = lines.slice(1, lastLineIsEmpty ? -1 : undefined);

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
