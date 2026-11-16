import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { readStreamText } from '../readStreamText.ts';

const PULLED = 'pulled';

describe(readStreamText, () => {
  it('joins every chunk that the stream contains', async () => {
    await expect(readStreamText(buildStream(['first ', 'second']))).resolves.toBe('first second');
  });

  it('returns an empty string when the stream contains nothing', async () => {
    await expect(readStreamText(buildStream([]))).resolves.toBe('');
  });

  it('decodes a multibyte sequence split across two chunks', async () => {
    const bytes = Buffer.from('é');

    await expect(readStreamText(buildStream([bytes.subarray(0, 1), bytes.subarray(1)]))).resolves.toBe('é');
  });

  it('leaves the encoding of the stream unchanged', async () => {
    const stream = buildStream(['text']);

    await readStreamText(stream);

    expect(stream.readableEncoding).toBeNull();
  });

  it('waits for a producer that has not yet written', async () => {
    const producer = buildGatedStream('late');
    const reading = readStreamText(producer.stream);

    // A read that settles without the producer wins the race and fails here rather than timing out.
    await expect(Promise.race([producer.pulled, reading])).resolves.toBe(PULLED);

    producer.release();

    await expect(reading).resolves.toBe('late');
  });
});

// region | Helpers

/**
 * Builds a byte stream whose one chunk is yielded only once the test releases it, as a producer that has to
 * reach a keychain or a network does. `pulled` resolves when the reader first asks the producer for a chunk.
 */
function buildGatedStream(chunk: string): { pulled: Promise<typeof PULLED>; release: () => void; stream: Readable } {
  const pulled = Promise.withResolvers<typeof PULLED>();
  const gate = Promise.withResolvers<string>();

  /** Signals the pull, then yields the chunk once the test releases it. */
  async function* emit(): AsyncGenerator<string> {
    pulled.resolve(PULLED);

    yield await gate.promise;
  }

  return {
    pulled: pulled.promise,
    release: () => gate.resolve(chunk),
    stream: Readable.from(emit(), { objectMode: false }),
  };
}

/** Builds a byte stream, rather than the object-mode stream to which `Readable.from` defaults, as a pipe is. */
function buildStream(chunks: Array<Buffer | string>): Readable {
  return Readable.from(chunks, { objectMode: false });
}

// endregion | Helpers
