import type { TimeoutId } from '../internal/types.ts';

export type CancellablePromise<T> = Promise<T> & { cancel: () => void };

/**
 * Returns a cancellable promise that resolves after the specified number of milliseconds.
 */
export function delay(ms: number): CancellablePromise<void> {
  let timeoutId: TimeoutId | undefined;
  let resolveFn: () => void;

  const promise = new Promise<void>((resolve) => {
    timeoutId = setTimeout(resolve, ms);
    resolveFn = resolve;
  });

  /**
   * Clears the timeout and immediately resolves the promise.
   */
  function cancel() {
    clearTimeout(timeoutId);
    resolveFn();
  }

  return Object.assign(promise, { cancel });
}
