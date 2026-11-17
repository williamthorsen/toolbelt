import { convertArrayToReadableStream } from 'ai/test';
import { describe, expect, it } from 'vitest';

import { encodeStreamEvent, type JobStreamRecord, parseJobStream } from '../jobStream.ts';

const EVENTS = [
  { name: 'job-event', data: { type: 'text-delta', text: 'Grüße, 世界 👋\n' } },
  { name: 'job-event', data: { type: 'round-finished', round: 1 } },
  { name: 'outcome', data: { status: 'completed', result: 'done' } },
] as const;

describe(parseJobStream, () => {
  it('recovers every encoded event when the chunks split the bytes at any position', async () => {
    const bytes = new TextEncoder().encode(EVENTS.map(({ name, data }) => encodeStreamEvent(name, data)).join(''));

    for (let split = 1; split < bytes.length; split += 1) {
      const records = await collect(
        parseJobStream(convertArrayToReadableStream([bytes.slice(0, split), bytes.slice(split)])),
      );

      expect(records, `split at byte ${split}`).toStrictEqual(EVENTS);
    }
  });

  it('skips comment lines and events without data', async () => {
    const text = ': keep-alive\n\nevent: outcome\n\n' + encodeStreamEvent('failure', { message: 'x' });

    const records = await collect(parseJobStream(toByteStream(text)));

    expect(records).toStrictEqual([{ name: 'failure', data: { message: 'x' } }]);
  });

  it('throws a SyntaxError on data that is not JSON', async () => {
    await expect(collect(parseJobStream(toByteStream('event: outcome\ndata: {\n\n')))).rejects.toBeInstanceOf(
      SyntaxError,
    );
  });
});

// region | Helpers
/** Collects every record that a parser yields. */
async function collect(records: AsyncIterable<JobStreamRecord>): Promise<JobStreamRecord[]> {
  return Array.fromAsync(records);
}

/** Returns a byte stream of one chunk. */
function toByteStream(text: string): ReadableStream<Uint8Array> {
  return convertArrayToReadableStream([new TextEncoder().encode(text)]);
}
// endregion | Helpers
