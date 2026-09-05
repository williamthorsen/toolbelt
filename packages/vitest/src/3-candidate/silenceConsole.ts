import { type MockInstance, vi } from 'vitest';

const ALL_CONSOLE_METHODS = ['debug', 'error', 'info', 'log', 'warn'] as const;

/**
 * Silences every console method for the enclosing scope, returning the spy backing each one and restoring
 * them all when the scope exits.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 */
export function silenceConsole(): Disposable & Record<ConsoleMethod, MockInstance>;
/**
 * Silences the given console methods for the enclosing scope, returning the spy backing each one and
 * restoring them all when the scope exits.
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
export function silenceConsole<M extends ConsoleMethod>(methods: readonly M[]): Disposable & Record<M, MockInstance>;
export function silenceConsole(
  methods: readonly ConsoleMethod[] = ALL_CONSOLE_METHODS,
): Disposable & Record<ConsoleMethod, MockInstance> {
  const entries = methods.map((method): [ConsoleMethod, MockInstance] => [method, silenceMethod(method)]);

  return Object.assign(toTypedRecord(entries), {
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      for (const [, spy] of entries) {
        spy.mockRestore();
      }
    },
  });
}

export type ConsoleMethod = (typeof ALL_CONSOLE_METHODS)[number];

// region | Helpers

/**
 * Spies on a single console method, replacing it with a no-op. Takes the full union rather than a narrowed
 * type parameter, which lets `mockImplementation` resolve against a settled signature.
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
