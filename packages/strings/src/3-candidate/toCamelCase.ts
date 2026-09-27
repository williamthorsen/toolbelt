import { capitalize } from './capitalize.ts';

/**
 * Returns the camelCase version of the input string.
 * Spaces, hyphens, and underscores are treated as word boundaries.
 * @param inputStr - The string to be converted.
 * @returns The input string converted to camelCase.
 */
export function toCamelCase(inputStr: string): string {
  const words = inputStr.trim().split(/[\s-_]+/);

  // Convert all substrings to lowercase, then capitalize every word after the first
  return words
    .map((word, index) => {
      const lowerCaseWord = word.toLowerCase();

      return index === 0 ? lowerCaseWord : capitalize(lowerCaseWord);
    })
    .join('');
}
