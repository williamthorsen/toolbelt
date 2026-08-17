/**
 * Collapses each whitespace run to a single space.
 *
 * An anchored window then reads the same however the source was wrapped, which is what lets a pattern span
 * an expression a formatter broke across lines.
 *
 * @internal
 */
export function condenseWhitespace(text: string): string {
  return text.replaceAll(/\s+/g, ' ');
}
