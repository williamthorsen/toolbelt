export function objectSize(obj: object | null | undefined): number {
  return Object.keys(obj || {}).length;
}
