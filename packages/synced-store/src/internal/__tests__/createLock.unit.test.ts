import { describe, expect, it } from 'vitest';

import { createLock } from '../createLock.ts';

describe(createLock, () => {
  it('runs overlapping tasks one at a time, in call order', async () => {
    const lock = createLock();
    const events: string[] = [];
    const first = Promise.withResolvers<undefined>();

    const a = lock.run(async () => {
      events.push('a start');
      await first.promise;
      events.push('a end');
      return 'a';
    });
    const b = lock.run(() => {
      events.push('b');
      return Promise.resolve('b');
    });
    await Promise.resolve();
    first.resolve(undefined);

    await expect(Promise.all([a, b])).resolves.toStrictEqual(['a', 'b']);
    expect(events).toStrictEqual(['a start', 'a end', 'b']);
  });

  it('runs the next task after one that rejects', async () => {
    const lock = createLock();
    const failure = new Error('failed');

    const a = lock.run(() => Promise.reject(failure));
    const b = lock.run(() => Promise.resolve('b'));

    await expect(a).rejects.toBe(failure);
    await expect(b).resolves.toBe('b');
  });
});
