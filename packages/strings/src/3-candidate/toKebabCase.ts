import { splitWords } from '../internal/splitWords.ts';

/**
 * Returns the kebab-case version of the input string: its words in lowercase, joined by `-`. The counterpart of
 * `toCamelCase`, it splits words the same way: Every run of characters that are neither letters nor digits separates
 * words and is dropped, and a capital following a lowercase letter or digit starts a new word, as does the last
 * capital of an acronym followed by a lowercase letter (`parseHTMLString` → `parse-html-string`). A letter followed by
 * a digit does not start one.
 * @category String
 * @experimental
 * @stage candidate
 */
export function toKebabCase(text: string): string {
  return splitWords(text)
    .map((word) => word.toLowerCase())
    .join('-');
}
