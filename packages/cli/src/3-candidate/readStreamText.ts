import { text } from 'node:stream/consumers';

/**
 * Reads a stream to end as text, awaiting a producer that has not yet written. A synchronous read of a
 * non-blocking pipe fails with `EAGAIN` rather than waiting, and a piped value can arrive on such a pipe.
 *
 * @category CLI
 * @stage candidate
 */
export async function readStreamText(stream: NodeJS.ReadableStream): Promise<string> {
  return text(stream);
}
