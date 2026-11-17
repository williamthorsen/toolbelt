import { BRACES, BRACKETS, readBalancedGroup } from './readBalancedGroup.ts';

const SCALAR_LITERAL = /^(?:-?\.?\d(?:[eE][+-]|[\w.])*|(?:false|null|true|undefined)(?![\w$]))/;
const STRING_DELIMITERS = new Set(['"', "'", '`']);

/**
 * Returns the offset past the literal that opens a text, or nothing when the text opens with no literal.
 *
 * The text is blanked code, in which a string keeps only its delimiters, so the next delimiter of its kind
 * closes it.
 *
 * @internal
 */
export function findLiteralEnd(text: string): number | undefined {
  const opener = text[0];
  if (opener === '{') return readBalancedGroup(text, 0, BRACES)?.end;
  if (opener === '[') return readBalancedGroup(text, 0, BRACKETS)?.end;

  if (opener !== undefined && STRING_DELIMITERS.has(opener)) {
    const close = text.indexOf(opener, 1);
    return close === -1 ? undefined : close + 1;
  }

  return SCALAR_LITERAL.exec(text)?.[0].length;
}
