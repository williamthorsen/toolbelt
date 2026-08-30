/**
 * Reads a matched literal's text from the unblanked source, dropping the quotes the span includes.
 *
 * A detector matching on blanked code sees a literal's characters replaced with spaces, so what the literal
 * holds is read from the source beneath at the span the match reports. Blanking preserves every offset, which
 * is what keeps the two texts aligned. The span is a `'d'`-flag match's index pair, and a match that captured
 * no such group reads as nothing.
 *
 * @internal
 */
export function readLiteral(source: string, span: readonly number[] | undefined): string | undefined {
  const start = span?.[0];
  const end = span?.[1];

  return start === undefined || end === undefined ? undefined : source.slice(start + 1, end - 1);
}
