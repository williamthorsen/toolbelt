import { describe, expectTypeOf, it } from 'vitest';

import type { KeyValueStore } from '../ports.ts';

/** The storage methods of AsyncStorage 2.2.0 (`@react-native-async-storage/async-storage`), as it declares them. */
interface AsyncStorageV2 {
  getItem: (key: string, callback?: (error?: Error | null, result?: string | null) => void) => Promise<string | null>;
  setItem: (key: string, value: string, callback?: (error?: Error | null) => void) => Promise<void>;
  removeItem: (key: string, callback?: (error?: Error | null) => void) => Promise<void>;
  getAllKeys: (callback?: (error?: Error | null, result?: readonly string[]) => void) => Promise<readonly string[]>;
}

/** The storage methods of AsyncStorage 3.1.1, as it declares them. */
interface AsyncStorageV3 {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getMany(keys: string[]): Promise<Record<string, string | null>>;
}

describe('KeyValueStore', () => {
  it('accepts AsyncStorage 2 and 3 without an adapter', () => {
    expectTypeOf<AsyncStorageV2>().toExtend<KeyValueStore>();
    expectTypeOf<AsyncStorageV3>().toExtend<KeyValueStore>();
  });
});
