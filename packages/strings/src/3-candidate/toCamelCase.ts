import { capitalize } from './capitalize.ts';

/**
 * Returns the camelCase version of the input string.
 * Spaces, hyphens, and underscores are treated as word boundaries.
 * @category String
 * @experimental
 * @stage candidate
 */
export function toCamelCase(text: string): string {
  const words = text.trim().split(/[\s-_]+/);

  // Convert all substrings to lowercase, then capitalize every word after the first
  return words
    .map((word, index) => {
      const lowerCaseWord = word.toLowerCase();

      return index === 0 ? lowerCaseWord : capitalize(lowerCaseWord);
    })
    .join('');
}
