import type { Version } from './types.ts';

/** Options for one call to a repository. */
export interface CallOptions {
  /** Aborts the call; a call whose signal is already aborted rejects with its reason and changes nothing. */
  signal?: AbortSignal | undefined;
}

/** A store of one document's versions, which the device's replica and the remote both implement. */
export interface SyncedRepository {
  /** Returns every unit's current version, tombstones included, in no particular order. */
  load(options?: CallOptions): Promise<readonly Version[]>;
  /** Merges the versions into the stored document under the rule of `mergeVersion`, all or none. */
  apply(versions: readonly Version[], options?: CallOptions): Promise<void>;
}

/** A store of strings by key, which AsyncStorage satisfies as it is. */
export interface KeyValueStore {
  /** Returns the value stored under the key, or `null` or `undefined` when nothing is. */
  getItem(key: string): Promise<string | null | undefined>;
  setItem(key: string, value: string): Promise<void>;
  /** Removes the value stored under the key, resolving also when nothing is. */
  removeItem(key: string): Promise<void>;
}
