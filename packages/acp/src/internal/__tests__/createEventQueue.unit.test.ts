import { describe, expect, it } from 'vitest';

import { createEventQueue } from '../createEventQueue.ts';

describe(createEventQueue, () => {
  it('yields values pushed before and during iteration, then ends on close', async () => {
    const queue = createEventQueue<{ n: number }>();
    queue.push({ n: 1 });
    const reading = Array.fromAsync(queue);
    queue.push({ n: 2 });
    queue.close();

    await expect(reading).resolves.toStrictEqual([{ n: 1 }, { n: 2 }]);
  });

  it('yields the buffered values before rejecting with the failure', async () => {
    const queue = createEventQueue<{ n: number }>();
    const read: Array<{ n: number }> = [];
    queue.push({ n: 1 });
    queue.fail(new Error('boom'));

    await expect(
      (async () => {
        for await (const value of queue) read.push(value);
      })(),
    ).rejects.toThrow('boom');
    expect(read).toStrictEqual([{ n: 1 }]);
  });

  it('drops values pushed after it closes', async () => {
    const queue = createEventQueue<{ n: number }>();
    queue.close();
    queue.push({ n: 1 });

    await expect(Array.fromAsync(queue)).resolves.toStrictEqual([]);
  });
});
