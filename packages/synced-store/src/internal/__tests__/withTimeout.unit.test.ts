import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { withTimeout } from '../withTimeout.ts';

describe(withTimeout, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rejects a call that never settles at the timeout, and aborts its signal', async () => {
    let received: AbortSignal | undefined;
    const result = withTimeout((signal) => {
      received = signal;
      return new Promise<never>(() => {});
    }, 1000);

    await vi.advanceTimersByTimeAsync(999);
    expect(received?.aborted).toBe(false);

    await Promise.all([expect(result).rejects.toMatchObject({ name: 'TimeoutError' }), vi.advanceTimersByTimeAsync(1)]);
    expect(received?.aborted).toBe(true);
  });

  it('settles with the result of a call that settles first, and clears its timer', async () => {
    await expect(withTimeout(() => Promise.resolve('answer'), 1000)).resolves.toBe('answer');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('rejects with the reason of a call that rejects first', async () => {
    const failure = new Error('refused');

    await expect(withTimeout(() => Promise.reject(failure), 1000)).rejects.toBe(failure);
  });

  it('drops a rejection that arrives after the timeout', async () => {
    const late = Promise.withResolvers<never>();
    const result = withTimeout(() => late.promise, 1000);

    await Promise.all([
      expect(result).rejects.toMatchObject({ name: 'TimeoutError' }),
      vi.advanceTimersByTimeAsync(1000),
    ]);
    late.reject(new Error('late'));
    await vi.advanceTimersByTimeAsync(0);
  });
});
