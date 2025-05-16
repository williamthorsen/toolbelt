/**
 * Encloses a string with the given opening and closing strings.
 * @experimental
 * @stage draft
 */
export function enclose(opening: string, closing = opening) {
  return (content: string): string => `${opening}${content}${closing}`;
}
