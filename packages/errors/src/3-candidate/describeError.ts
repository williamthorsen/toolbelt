/**
 * Returns a human-readable description of a thrown value: an `Error`'s message, or the value stringified.
 *
 * An `Error` carrying no message describes as its stringification -- `Error`, or the class's own `name` where
 * it sets one -- so a caller composing a longer message never interpolates an empty string. Describing never
 * throws: `String()` raises on a null-prototype object and propagates a throwing `toString`, and a describer
 * that fails inside a catch block discards the very error it was called to report.
 *
 * @example
 * describeError(new Error('connection refused')); // 'connection refused'
 * describeError('connection refused'); // 'connection refused'
 *
 * @category Errors
 * @experimental
 * @stage candidate
 */
export function describeError(error: unknown): string {
  if (error instanceof Error && typeof error.message === 'string' && error.message !== '') {
    return error.message;
  }

  return stringify(error);
}

// region | Helpers

/**
 * Coerces a value to a string, answering with a placeholder where the coercion itself throws.
 */
function stringify(value: unknown): string {
  try {
    return String(value);
  } catch {
    return '[unstringifiable value]';
  }
}

// endregion | Helpers
