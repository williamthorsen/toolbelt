import type { TimeoutId } from '../internal/types.ts';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => void;

interface DebounceOptions {
  noInitialDelay?: boolean;
  maxWaitMs?: number;
}

/**
 * Returns a function whose execution is delayed until after the wait time has elapsed since its last invocation.
 * Optionally, the function can be invoked immediately on the leading edge instead of the trailing edge.
 *
 * @param callback - The function to debounce.
 * @param delayMs - The number of milliseconds to delay.
 * @param noInitialDelay - If `true`, trigger the callback on the leading edge instead of the trailing edge.
 * @param maxWaitMs - The maximum time to wait before invoking the callback.
 * @returns A new debounced function.
 */
export function debounce<T extends Callback>(
  callback: T,
  delayMs: number,
  { noInitialDelay = false, maxWaitMs = delayMs }: DebounceOptions = {},
): DebouncedFunction<T> {
  let lastCalledAt: number | undefined;
  let timeoutId: TimeoutId;

  function debouncedFunction(...args: Parameters<T>): void {
    const now = Date.now();

    if (noInitialDelay && lastCalledAt === undefined) {
      callback(...args);
      lastCalledAt = now;
      return;
    }

    lastCalledAt ??= now;
    clearTimeout(timeoutId);

    const timeSinceLastCall = now - lastCalledAt;
    timeoutId = setTimeout(() => {
      callback(...args);
      lastCalledAt = now;
    }, maxWaitMs - timeSinceLastCall);
  }

  debouncedFunction.cancel = () => {
    clearTimeout(timeoutId);
    lastCalledAt = undefined;
  };

  return debouncedFunction;
}

export interface DebouncedFunction<T extends Callback> {
  (...args: Parameters<T>): void;
  cancel(): void;
}
