import { describeError } from '../4-release/describeError.ts';

/**
 * Returns an `Error` prefixing `message` to a description of `cause`, and containing `cause` as its own.
 *
 * The original value is stored in `cause` whatever its type, so a handler further up can still inspect what was
 * actually thrown rather than only the text describing it. When the runtime supports it, this function's own
 * frame is dropped from the stack, leaving the throwing call site on top.
 *
 * @example
 * throw chainError('Failed to load config', error); // 'Failed to load config: ENOENT'
 *
 * @category Errors
 * @experimental
 * @stage candidate
 */
export function chainError(message: string, cause: unknown): Error {
  const error = new Error(`${message}: ${describeError(cause)}`, { cause });

  // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- V8-only, and guarded because this package imports no `node:` builtin, which lets it run on a runtime without `captureStackTrace`.
  if (typeof Error.captureStackTrace === 'function') Error.captureStackTrace(error, chainError);

  return error;
}
