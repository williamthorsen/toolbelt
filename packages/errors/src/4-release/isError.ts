/**
 * Reports whether a value is an `Error`, narrowing it where it is.
 *
 * The `instanceof` test alone answers only for the realm it runs in: an `Error` thrown across a worker, an
 * iframe, or a `vm` context fails it despite being a genuine one. Falling back to the object tag catches those,
 * because the tag reads from the internal slot every `Error` constructor sets rather than from a prototype
 * chain the realm boundary breaks.
 *
 * Neither test subsumes the other, so both run. `instanceof` alone misses the cross-realm cases; the tag alone
 * misses `DOMException` -- `AbortError` and `QuotaExceededError` among them -- which inherits from `Error` but
 * carries a tag of its own.
 *
 * A plain object assigning itself the `Error` tag passes, which no accidental value does.
 *
 * @example
 * isError(new Error('connection refused')); // true
 * isError('connection refused'); // false
 *
 * @category Errors
 * @stage release
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error || Object.prototype.toString.call(error) === '[object Error]';
}
