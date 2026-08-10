/**
 * Throws unless the value is a finite number.
 *
 * @internal
 */
export function assertFinite(value: number, label: string): void {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be a finite number.`);
  }
}
