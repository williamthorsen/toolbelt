import process from 'node:process';

import { type MockInstance, vi } from 'vitest';

/**
 * Replaces `process.exit` for the enclosing scope with an implementation that throws, returning the spy
 * backing it and restoring the original when the scope exits.
 *
 * The mock throws because a mock that returns lets execution continue past the exit, and the test then
 * asserts against a path never reached by the process in production. Nothing reports that: the suite passes
 * while covering code that cannot run.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * using _exit = throwOnProcessExit();
 *
 * const error = await captureError(ProcessExitError, () => tagCommand(['--unknown']));
 *
 * expect(error.code).toBe(1);
 */
export function throwOnProcessExit(): MockedProcessExit {
  const spy = vi.spyOn(process, 'exit').mockImplementation((code) => {
    throw new ProcessExitError(code);
  });

  return {
    spy,
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      spy.mockRestore();
    },
  };
}

/**
 * Error thrown in place of a process exit, carrying the code the call passed.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 */
export class ProcessExitError extends Error {
  readonly code: number | undefined;

  constructor(code?: number | string | null) {
    // Node accepts an integer string and exits with its numeric value, so the string form is coerced rather
    // than discarded. A code of `null` and an absent one both mean the caller named none.
    const exitCode = code === undefined || code === null ? undefined : Number(code);

    super(`process.exit(${exitCode})`);

    this.name = 'ProcessExitError';
    this.code = exitCode;
  }
}

export interface MockedProcessExit extends Disposable {
  spy: MockInstance<typeof process.exit>;
}
