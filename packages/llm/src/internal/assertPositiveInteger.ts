/**
 * Throws a `RangeError` naming the option unless its value is a positive integer.
 *
 * @internal
 */
export function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer; received ${value}.`);
  }
}
