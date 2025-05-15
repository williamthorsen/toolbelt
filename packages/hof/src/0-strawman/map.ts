export function map<T, V>(predicate: (item: T, index: number, array: readonly T[]) => V) {
  return function (items: ReadonlyArray<T>): V[] {
    return items.map(predicate);
  };
}
