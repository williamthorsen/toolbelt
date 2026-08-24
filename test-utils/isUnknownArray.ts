/**
 * Reports whether a value is an array, narrowing it to `unknown[]`.
 *
 * `Array.isArray` narrows an `unknown` to `any[]`, which carries `any` into everything read out of it. This
 * says the same thing and keeps the elements unknown.
 */
export function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}
