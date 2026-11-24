/**
 * Orders two change stamps: negative when `a` is older, positive when it is newer, and 0 when they are equal. The
 * order is that of their UTF-16 code units, which a remote reproduces in SQL with a binary (`C`) collation.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function compareStamps(a: string, b: string): number {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}
