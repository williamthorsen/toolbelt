/**
 * Collapses each whitespace run to a single space.
 *
 * An anchored window then reads the same however the source was wrapped, which lets a pattern span
 * an expression broken across lines by a formatter.
 *
 * @internal
 */
export function condenseWhitespace(text: string): string {
  return text.replaceAll(/\s+/g, ' ');
}
