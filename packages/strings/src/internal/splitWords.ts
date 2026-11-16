/**
 * Splits text into words, keeping each word's case. Every run of characters that are neither letters nor digits
 * separates words and is dropped. A lowercase letter or digit followed by a capital starts a new word, and so does
 * the last capital of a run of capitals that is followed by a lowercase letter, which keeps an acronym whole. A
 * letter followed by a digit does not start one.
 * @example
 * ```ts
 * splitWords('parseHTMLString v2'); // => ['parse', 'HTML', 'String', 'v2']
 * ```
 * @internal
 */
export function splitWords(text: string): string[] {
  return text
    .replaceAll(LOWER_THEN_UPPER, '$1 $2')
    .replaceAll(ACRONYM_THEN_WORD, '$1 $2')
    .split(SEPARATORS)
    .filter((word) => word !== '');
}

// A letter without case, such as a CJK character, counts as lowercase, so it never starts a word.
const LOWER_THEN_UPPER = /([\p{Ll}\p{Lm}\p{Lo}\p{N}])(\p{Lu})/gu;
const ACRONYM_THEN_WORD = /(\p{Lu})(\p{Lu}\p{Ll})/gu;
const SEPARATORS = /[^\p{L}\p{N}]+/u;
