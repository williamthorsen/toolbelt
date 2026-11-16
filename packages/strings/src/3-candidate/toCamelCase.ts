import { splitWords } from '../internal/splitWords.ts';
import { capitalize } from './capitalize.ts';

/**
 * Returns the camelCase version of the input string: the first word in lowercase, each later word capitalized.
 * Words are split as `toKebabCase` splits them: Every run of characters that are neither letters nor digits separates
 * words and is dropped, and a capital following a lowercase letter or digit starts a new word, as does the last
 * capital of an acronym followed by a lowercase letter (`parseHTMLString` → `parseHtmlString`).
 * @category String
 * @experimental
 * @stage candidate
 */
export function toCamelCase(text: string): string {
  return splitWords(text)
    .map((word, index) => {
      const lowerCaseWord = word.toLowerCase();

      return index === 0 ? lowerCaseWord : capitalize(lowerCaseWord);
    })
    .join('');
}
