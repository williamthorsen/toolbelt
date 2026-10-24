import { beforeEach } from 'vitest';

import { installOutputGuard, type Violation } from '../internal/outputGuard.ts';

const EXCERPT_LENGTH = 200;

/**
 * Fails each test that writes to `process.stdout` or `process.stderr`, or emits a process warning, without
 * capturing the output. The guard holds the output back, so the terminal stays clean, and the failure names
 * each stream or warning with the start of its text. Call it at the top level of a Vitest setup file.
 *
 * Output taken by `captureStdio`, `captureWarnings`, or a spy on the stream passes. Output made outside a test,
 * such as in `beforeAll` or while a file is collected, passes through unchanged. `console.*` is out of scope:
 * Vitest intercepts it.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * // vitest.setup.ts, listed under `test.setupFiles`
 * failOnUncapturedOutput();
 */
export function failOnUncapturedOutput(): void {
  const guard = installOutputGuard();

  beforeEach(({ onTestFinished }) => {
    guard.startTest();

    // Finish hooks unwind as a stack, so this one, registered first, runs after every `afterEach` and every
    // finish hook that the test registers, whatever `sequence.hooks` says.
    onTestFinished(() => {
      const violations = guard.finishTest();
      if (violations.length > 0) throw new Error(formatViolations(violations));
    });
  });
}

// region | Helpers

/** Truncates a text to the excerpt length, marking a cut with an ellipsis. */
function excerpt(text: string): string {
  return text.length > EXCERPT_LENGTH ? `${text.slice(0, EXCERPT_LENGTH)}…` : text;
}

/** Builds the failure message, one line per violation. */
function formatViolations(violations: readonly Violation[]): string {
  const lines = violations.map(({ source, text }) => `  ${source}: ${JSON.stringify(excerpt(text))}`);

  return ['The test produced output that no capture took:', ...lines].join('\n');
}

// endregion | Helpers
