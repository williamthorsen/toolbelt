/**
 * Collapses each run of whitespace within a line to a single space, preserving line breaks.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export function condenseWhitespace(str: string): string {
  return str.split('\n').map(condenseWhitespaceSingleLine).join('\n');
}

/**
 * Removes all whitespace from a string.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export function removeWhitespace(str: string): string {
  return str.replaceAll(/\s+/g, '');
}

/**
 * Collapses each run of whitespace within a line to a single space and trims each line, preserving line breaks.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export function trimWhitespace(str: string): string {
  return str
    .split('\n')
    .map(condenseWhitespaceSingleLine)
    .map((line) => line.trim())
    .join('\n');
}

// region | Helpers
/**
 * Collapses each run of whitespace to a single space.
 */
function condenseWhitespaceSingleLine(str: string): string {
  return str.replaceAll(/\s+/g, ' ');
}
// endregion | Helpers
