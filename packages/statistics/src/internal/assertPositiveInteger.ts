/**
 * Throws unless the value is a safe integer of 1 or greater.
 *
 * @internal
 */
export function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${label} must be a safe integer.`);
  }
  if (value < 1) {
    throw new Error(`${label} must be greater than 0.`);
  }
}
