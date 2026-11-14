/**
 * Narrows every entry of a response array, returning `undefined` when any entry is unreadable. A read that drops
 * an entry would act on a partial list, so a caller refuses the whole response instead.
 *
 * @internal
 */
export function readEvery<T>(
  values: readonly unknown[],
  readEntry: (value: unknown) => T | undefined,
): T[] | undefined {
  const entries: T[] = [];

  for (const value of values) {
    const entry = readEntry(value);
    if (entry === undefined) return undefined;
    entries.push(entry);
  }

  return entries;
}
