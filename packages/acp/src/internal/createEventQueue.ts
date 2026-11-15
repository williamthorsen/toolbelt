/** A queue that producers push to through callbacks and that one consumer reads as an async iterable. */
export interface EventQueue<T extends object> extends AsyncIterable<T> {
  push(value: T): void;
  /** Ends the iteration once the buffered values are read. */
  close(): void;
  /** Rejects the iteration with `error` once the buffered values are read. */
  fail(error: unknown): void;
}

/**
 * Creates an event queue. Values pushed after the queue closes or fails are dropped.
 *
 * @internal
 */
export function createEventQueue<T extends object>(): EventQueue<T> {
  const buffer: T[] = [];
  let ending: 'closed' | undefined | { error: unknown };
  let wake: (() => void) | undefined;

  function wakeConsumer(): void {
    wake?.();
    wake = undefined;
  }

  return {
    push(value) {
      if (ending !== undefined) return;
      buffer.push(value);
      wakeConsumer();
    },
    close() {
      ending ??= 'closed';
      wakeConsumer();
    },
    fail(error) {
      ending ??= { error };
      wakeConsumer();
    },
    async *[Symbol.asyncIterator]() {
      for (;;) {
        const value = buffer.shift();
        if (value !== undefined) {
          yield value;
          continue;
        }
        if (ending === 'closed') return;
        if (ending !== undefined) throw ending.error;
        const { promise, resolve } = Promise.withResolvers<undefined>();
        wake = () => {
          resolve(undefined);
        };
        await promise;
      }
    },
  };
}
