/** Runs tasks one at a time, in call order. */
export interface Lock {
  /** Runs the task once every earlier task has settled, and settles with its result. */
  run<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * Creates a lock whose tasks run one at a time, in call order; a task that rejects does not stop the next.
 *
 * @internal
 */
export function createLock(): Lock {
  let tail: Promise<void> = Promise.resolve();

  return {
    run(task) {
      const previous = tail;
      const result = (async () => {
        await previous;
        return await task();
      })();
      tail = settle(result);
      return result;
    },
  };
}

// region | Helpers
async function settle(promise: Promise<unknown>): Promise<void> {
  try {
    await promise;
  } catch {
    // Leave the failure to the caller that awaits the task itself.
  }
}
// endregion | Helpers
