export function isScalar(value: unknown): value is Scalar {
  return value === null || (typeof value !== 'object' && typeof value !== 'function');
}

export type Scalar = string | number | bigint | boolean | symbol | undefined | null;
