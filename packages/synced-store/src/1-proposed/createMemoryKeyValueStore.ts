import type { KeyValueStore } from './ports.ts';

/**
 * Creates a `KeyValueStore` that keeps its values in memory.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function createMemoryKeyValueStore(): KeyValueStore {
  const values = new Map<string, string>();

  return {
    getItem(key) {
      return Promise.resolve(values.get(key));
    },
    setItem(key, value) {
      values.set(key, value);
      return Promise.resolve();
    },
    removeItem(key) {
      values.delete(key);
      return Promise.resolve();
    },
  };
}
