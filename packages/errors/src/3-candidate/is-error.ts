/**
 * Narrows a thrown value to `Error`, rethrowing the value itself when it is not one.
 *
 * Rethrowing the value rather than a diagnostic of its own leaves it intact for a handler further up, which
 * may know what to do with a thrown value that is not an `Error`.
 *
 * @example
 * try { read(); } catch (error) { assertIsError(error); log(error.message); }
 *
 * @category Errors
 * @experimental
 * @stage candidate
 * @throws The value itself, when it is not an `Error`.
 */
export function assertIsError(error: unknown): asserts error is Error {
  if (!isError(error)) {
    throw error;
  }
}

/**
 * Reports whether a value is an `Error`, narrowing it where it is.
 *
 * @category Errors
 * @experimental
 * @stage candidate
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}
