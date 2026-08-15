/**
 * Extracts and returns weights from an array of items.
 * If all weights are undefined, returns an array of uniform weights.
 * If any weights are defined, undefined weights are treated as 0.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function extractWeights<T>(
  items: ReadonlyArray<T>,
  getWeight: (item: T, index: number, items: ReadonlyArray<T>) => number | undefined,
): number[] {
  const weights = items.map((item, index, items) => getWeight(item, index, items));
  if (weights.every((weight) => weight === undefined)) {
    const uniformWeight = 1 / items.length;
    return Array.from({ length: items.length }, () => uniformWeight);
  }
  return weights.map((weight) => weight ?? 0);
}
