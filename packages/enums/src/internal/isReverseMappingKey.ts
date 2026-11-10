/**
 * Returns true if the key is one that a numeric enum's reverse mapping adds, mapping a value back to its member name.
 *
 * @internal
 */
export function isReverseMappingKey(key: string): boolean {
  return !Number.isNaN(Number(key));
}
