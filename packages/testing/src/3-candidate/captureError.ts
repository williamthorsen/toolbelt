import { inspect } from 'node:util';

import { isError } from '@williamthorsen/toolbelt.errors';

/**
 * Runs a call expected to fail and returns the `Error` that it threw or rejected with.
 *
 * Accepts a synchronous or an asynchronous call: The call's return value is awaited, so a thrown error and a
 * rejected promise arrive by the same path, and the result is awaited either way. Fails the test when the call
 * completes normally or throws a non-`Error`, so a regression that stops the failure is reported at this call rather
 * than by a later assertion running against `undefined`.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 */
export function captureError(run: () => unknown): Promise<Error>;
/**
 * Runs a call expected to fail and returns the error that it threw or rejected with, narrowed to the expected
 * class. The class may be an abstract base, which an error of any subclass satisfies.
 *
 * Fails the test when the call completes normally or throws anything else, with a message naming what happened:
 * `Expected the call to throw, but it returned: 'ok'`, which names no class because nothing was compared against
 * one, or `Expected the call to throw KitError, but it threw: TypeError: url is not a function`. A failure for a
 * thrown value sets that value as its `cause`, so the real error's stack survives into the report.
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

/** Constructor of an error class, accepting an abstract base and one taking required arguments. */
type ErrorClass<E extends Error> = abstract new (...args: never[]) => E;

// region | Helpers

/**
 * Renders a thrown value for a failure message. An `Error` gives its class and message, because the expectation
 * was tested against the class and `inspect` would print the whole stack in its place.
 */
function renderThrown(value: unknown): string {
  return isError(value) ? `${value.constructor.name}: ${value.message}` : inspect(value);
}

// endregion | Helpers
