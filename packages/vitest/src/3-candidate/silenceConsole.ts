import { type MockInstance, vi } from 'vitest';

const ALL_CONSOLE_METHODS: readonly ConsoleMethod[] = ['debug', 'error', 'info', 'log', 'warn'];

/**
 * Silences the given console methods for the enclosing scope, returning the spy backing each one and
 * restoring them all when the scope exits. Silences every method when called with no argument.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * using silent = silenceConsole(['warn']);
 * emitDeprecationWarning();
 * expect(silent.warn).toHaveBeenCalledWith('deprecated');
 */
export function silenceConsole<M extends ConsoleMethod = ConsoleMethod>(
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- omitting the argument resolves `M` to the full union, which is what the constant holds.
  methods: readonly M[] = ALL_CONSOLE_METHODS as readonly M[],
): Disposable & Record<M, MockInstance> {
  const entries = methods.map((method): [M, MockInstance] => [method, silenceMethod(method)]);

  return Object.assign(toTypedRecord(entries), {
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      for (const [, spy] of entries) {
        spy.mockRestore();
      }
    },
  });
}

export type ConsoleMethod = 'debug' | 'error' | 'info' | 'log' | 'warn';

// region | Helpers

/**
 * Spies on a single console method, replacing it with a no-op. Takes the full union rather than the caller's
 * narrowed type parameter, which is what lets `mockImplementation` resolve against a settled signature.
 */
function silenceMethod(method: ConsoleMethod): MockInstance {
  return vi.spyOn(console, method).mockImplementation(() => {});
}

/** Type-preserving wrapper around `Object.fromEntries`. */
function toTypedRecord<K extends string, V>(entries: Array<[K, V]>): Record<K, V> {
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.fromEntries widens keys to string; the assertion restores them.
  return Object.fromEntries(entries) as Record<K, V>;
}

// endregion | Helpers
