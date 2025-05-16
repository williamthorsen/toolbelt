/**
 * Returns true if the value is a scalar type (string, number, bigint, boolean, symbol, undefined, or null).
 *
 * @experimental
 * @stage candidate
 *
 * @todo Move to guards library.
 */
export function isScalar(value: unknown): value is Scalar {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

export type Scalar = string | number | bigint | boolean | symbol | undefined | null;
