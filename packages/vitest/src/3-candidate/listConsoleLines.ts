import type { MockInstance } from 'vitest';

/**
 * Lists the lines a spied console method received, rendering each call the way the method would have written it.
 *
 * A reader rather than a capturer: it takes the spy `silenceConsole` already installed instead of claiming the
 * same `vi.spyOn` slot, which two silences cannot share.
 *
 * Each argument renders through `String` and the arguments join on a space, so an `Error` reads as its message.
 * A caller asserting on what the stream received, format specifiers and inspected objects included, wants
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
  // `MockInstance`'s default type parameter types each call's arguments as `any[]`; the annotation stops that
  // spreading into the returned array.
  return spy.mock.calls.map((args: unknown[]) => args.map(String).join(' '));
}
