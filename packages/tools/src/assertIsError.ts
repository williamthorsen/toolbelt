/**
 * This is a type guard for Error objects. It does nothing if the input is
 * an instance of the Error class. Otherwise, it throws the input as an error.
 */
export function assertIsError(error: unknown): asserts error is Error {
  if (!(error instanceof Error)) {
    throw error;
  }
}
