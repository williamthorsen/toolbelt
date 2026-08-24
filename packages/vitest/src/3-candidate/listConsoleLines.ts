import type { MockInstance } from 'vitest';

/**
 * Lists the lines a spied console method received, one per call.
 *
 * Reads the spy `silenceConsole` hands back, so the two compose; a `vi.spyOn` spy on a console method reads the
 * same way.
 *
 * Each call's arguments render through `String` and join on a space, so an `Error` reads as its message. A test
 * asserting on rendered stream output, format specifiers and inspected objects included, wants `captureStdio`
 * in `@williamthorsen/toolbelt.testing` instead.
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
  // `MockInstance`'s default type parameter types each call's arguments as `any[]`; the annotation stops that
  // spreading into the returned array.
  return spy.mock.calls.map((args: unknown[]) => args.map(String).join(' '));
}
