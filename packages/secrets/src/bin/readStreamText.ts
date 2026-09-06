/**
 * Reads a stream to end as text, awaiting a producer that has not yet written. A synchronous read of a
 * non-blocking pipe fails with `EAGAIN` rather than waiting, which is how a piped secret arrives.
 *
 * @internal
 */
export async function readStreamText(stream: NodeJS.ReadableStream): Promise<string> {
  stream.setEncoding('utf8');

  const chunks: string[] = [];
  for await (const chunk of stream) chunks.push(String(chunk));

  return chunks.join('');
}
