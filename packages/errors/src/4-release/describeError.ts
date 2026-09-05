import { isError } from './isError.ts';

/**
 * Returns a human-readable description of a thrown value: an `Error`'s message, or the value stringified.
 *
 * An `Error` carrying no message describes as its stringification -- `Error`, or the class's own `name` where
 * it sets one -- so a caller composing a longer message never interpolates an empty string.
 *
 * Describing never throws. A null-prototype object, a `toString` that throws, and a `message` accessor that
 * throws all describe as `[unstringifiable value]`, because a describer that fails inside a catch block discards
 * the very error that it was called to report.
 *
 * @example
 * describeError(new Error('connection refused')); // 'connection refused'
 * describeError('connection refused'); // 'connection refused'
 *
 * @category Errors
 * @stage release
 */
export function describeError(error: unknown): string {
  try {
    if (isError(error) && typeof error.message === 'string' && error.message !== '') {
      return error.message;
    }

    return String(error);
  } catch {
    return '[unstringifiable value]';
  }
}
