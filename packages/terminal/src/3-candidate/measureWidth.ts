import stringWidth from 'string-width';

/**
 * Reports the terminal cells that text occupies, which its length does not: an emoji is two cells and one or
 * more UTF-16 units, and an ANSI escape is several units and no cells at all.
 *
 * An ambiguous-width character such as `→` counts as one cell. That is a reading rather than a fact, since a
 * CJK-locale terminal draws it as two, and it is the reason `defineGlyphSet` refuses one in a plain glyph. Text
 * that may hold one is measured against the narrow reading here.
 *
 * @category Terminal
 * @experimental
 * @stage candidate
 */
export function measureWidth(text: string): number {
  return stringWidth(text);
}
