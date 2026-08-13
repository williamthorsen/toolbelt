import { inspect } from 'node:util';

/**
 * Runs a call expected to fail and returns the `Error` it threw or rejected with.
 *
 * Accepts a synchronous or an asynchronous call. Fails the test when the call completes normally or throws a
 * non-`Error`, so a regression that stops the failure reports itself rather than leaving a later assertion to
 * run against `undefined`.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 */
export function captureError(run: () => unknown): Promise<Error>;
/**
 * Runs a call expected to fail and returns the error it threw or rejected with, narrowed to the expected
 * class. Fails the test when the call completes normally or throws anything else, carrying what it did throw
 * as the failure's `cause`.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * const error = await captureError(UnresolvableKitImportsError, () => loadRemoteKit({ url }));
 * expect(error.findings.missing).toStrictEqual([{ specifier: 'readyup/check-utils' }]);
 */
export function captureError<E extends Error>(ErrorClass: ErrorClass<E>, run: () => unknown): Promise<E>;
export async function captureError(
  ...args: [run: () => unknown] | [ErrorClass: ErrorClass<Error>, run: () => unknown]
): Promise<Error> {
  const [expected, run] = args.length === 2 ? args : [Error, args[0]];

  let returned: unknown;
  try {
    returned = await run();
  } catch (error: unknown) {
    if (error instanceof expected) return error;

    throw new Error(`Expected the call to throw ${expected.name}, but it threw: ${renderThrown(error)}`, {
      cause: error,
    });
  }

  throw new Error(`Expected the call to throw, but it returned: ${inspect(returned)}`);
}

/** Constructor of an error class, admitting an abstract base and one taking required arguments. */
type ErrorClass<E extends Error> = abstract new (...args: never[]) => E;

// region | Helpers

/**
 * Renders a thrown value for a failure message. An `Error` gives its class and message, because the class is
 * what the expectation was tested against and `inspect` would print the whole stack in its place.
 */
function renderThrown(value: unknown): string {
  return value instanceof Error ? `${value.constructor.name}: ${value.message}` : inspect(value);
}

// endregion | Helpers
