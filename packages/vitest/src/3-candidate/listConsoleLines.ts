import type { MockInstance } from 'vitest';

/**
 * Lists the lines received by a spied console method, one per call.
 *
 * Reads the spy that `silenceConsole` returns, so the two compose; a `vi.spyOn` spy on a console method reads the
 * same way.
 *
 * Renders each call's arguments through `String` and joins them on a space: An `Error` appears as its message. A
 * test asserting on rendered stream output, format specifiers and inspected objects included, should use
 * `captureStdio` in `@williamthorsen/toolbelt.testing` instead.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * using silent = silenceConsole(['warn']);
 * emitDeprecationWarning();
 * expect(listConsoleLines(silent.warn)).toStrictEqual(['deprecated: use tagRelease']);
 */
export function listConsoleLines(spy: MockInstance): string[] {
  // `MockInstance`'s default type parameter types each call's arguments as `any[]`; the annotation types them
  // as `unknown`, so anything read out of `args` has to narrow.
  return spy.mock.calls.map((args: unknown[]) => args.map(String).join(' '));
}
