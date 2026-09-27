/** Returns the number of own enumerable string keys of an object, or 0 for null or undefined. */
export function objectSize(obj: object | null | undefined): number {
  return Object.keys(obj || {}).length;
}
