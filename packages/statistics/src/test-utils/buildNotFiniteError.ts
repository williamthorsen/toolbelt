/** Returns the error that `assertFinite` throws for the label. */
export function buildNotFiniteError(label: string): TypeError {
  return new TypeError(`${label} must be a finite number.`);
}
