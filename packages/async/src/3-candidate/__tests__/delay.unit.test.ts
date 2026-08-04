import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { delay } from '../delay.ts';
import { flushMicrotasks } from '../flushMicrotasks.ts';

describe(delay, () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the delay elapses', async () => {
    const onComplete = vi.fn<() => void>();
    const promise = delay(1_000);
    void (async () => {
      await promise;
      onComplete();
    })();

    vi.advanceTimersByTime(1_000);
    await flushMicrotasks();

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('resolves if cancel is called before the delay completes', async () => {
    const onComplete = vi.fn<() => void>();
    const onError = vi.fn<(error: unknown) => void>();
    const promise = delay(1_000);
    void (async () => {
      try {
        await promise;
        onComplete();
      } catch (error) {
        onError(error);
      }
    })();

    promise.cancel();

    vi.advanceTimersByTime(1_000);
    await flushMicrotasks();

    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onError).not.toHaveBeenCalled();
  });
});
