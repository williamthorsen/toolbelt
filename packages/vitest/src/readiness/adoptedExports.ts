/**
 * The package's callable exports. A call to one of them counts toward adoption.
 *
 * `ProcessExitError` is absent because a consumer catches it rather than calling it, so no mention of it is a
 * call.
 *
 * @internal
 */
export const ADOPTED_EXPORTS: readonly string[] = [
  'disposeOnTestFinished',
  'listConsoleLines',
  'makeFixture',
  'silenceConsole',
  'throwOnProcessExit',
];
