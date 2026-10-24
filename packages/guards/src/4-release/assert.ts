/**
 * Asserts that a condition is true, throwing an error if it is not.
 * Optionally throws a custom error or uses a custom message in the error.
 *
 * @category Assertions
 * @stage release
 */
export function assert(condition: unknown, error?: Error | string): asserts condition {
  if (condition) {
    return;
  }

  // rdy-ignore-next-line toolbelt.errors/no-instanceof-error -- a caller-supplied argument, not a caught value
  if (error instanceof Error) {
    throw error;
  }
  throw new Error(error || 'Assertion failed');
}
