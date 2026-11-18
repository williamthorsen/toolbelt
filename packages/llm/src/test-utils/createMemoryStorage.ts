import type { KeyValueStorage } from '../types/credential.ts';

/** Creates a storage that keeps its entries in a map, standing in for a browser storage under Node. */
export function createMemoryStorage(entries: Record<string, string> = {}): KeyValueStorage & {
  readonly entries: Map<string, string>;
} {
  const map = new Map(Object.entries(entries));
  return {
    entries: map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
  };
}
