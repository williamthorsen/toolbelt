import process from 'node:process';

import { type MockInstance, vi } from 'vitest';

/**
 * Replaces `process.exit` for the enclosing scope with an implementation that throws, returning the spy
 * backing it and restoring the original when the scope exits.
 *
 * The mock throws because a mock that returns lets execution continue past the exit, and the test then
 * asserts against a path never reached by the process in production. Nothing reports that: The suite passes
 * while covering code that cannot run.
 *
 * The error's `code` is the call's code as Node reads it: an integer string as its number, and no code as
 * `undefined`. A code that Node rejects, such as `'abc'` or `1.5`, throws the error that Node throws, rather than a
 * `ProcessExitError`.
 *
 * `process.exitCode` is not covered: Setting it does not halt execution, so the test reads it after the call and
 * restores it, since a leaked value makes the whole Vitest run exit non-zero. Mocks do not stack: `vi.spyOn` returns
 * the existing spy, so a nested call restores `process.exit` for both scopes when it exits.
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
    throw new ProcessExitError(normalizeExitCode(code));
  });

  return {
    spy,

    [Symbol.dispose]() {
      spy.mockRestore();
    },
  };
}

/**
 * Error thrown in place of a process exit, with the code that the call passed.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 */
export class ProcessExitError extends Error {
  readonly code: number | undefined;

  /** Normalizes the code passed to `process.exit` into a number. */
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

// region | Helpers

/**
 * Validates and normalizes an exit code through the `process.exitCode` setter, which applies the rules of
 * `process.exit` and throws its errors, then restores the previous value.
 */
function normalizeExitCode(code: number | string | null | undefined): number | undefined {
  const previous = process.exitCode;

  try {
    process.exitCode = code;
    const normalized = process.exitCode;

    return typeof normalized === 'number' ? normalized : undefined;
  } finally {
    // A leaked value would become the exit code of the process running the tests.
    process.exitCode = previous;
  }
}

// endregion | Helpers
