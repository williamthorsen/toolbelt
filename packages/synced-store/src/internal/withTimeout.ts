/**
 * Runs the call with a signal that aborts after `ms` milliseconds, and rejects with a `TimeoutError` `DOMException`
 * at that moment even when the call ignores the signal and never settles. A call that settles first settles the
 * result; its rejection after the timeout is dropped.
 *
 * @internal
 */
export function withTimeout<T>(call: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const controller = new AbortController();
  const { promise: timedOut, reject } = Promise.withResolvers<never>();
  const timer = setTimeout(() => {
    const reason = new DOMException(`The request did not answer within ${ms} ms`, 'TimeoutError');
    controller.abort(reason);
    reject(reason);
  }, ms);

  const settled = (async () => {
    try {
      return await call(controller.signal);
    } finally {
      clearTimeout(timer);
    }
  })();
  void ignoreRejection(settled);
  return Promise.race([settled, timedOut]);
}

// region | Helpers
async function ignoreRejection(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
  } catch {
    // Drop a rejection that arrives after the timeout; the race reports the one that arrives first.
  }
}
// endregion | Helpers
