/**
 * Returns the 1-based line holding an offset.
 *
 * @internal
 */
export function getLineAtOffset(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}
