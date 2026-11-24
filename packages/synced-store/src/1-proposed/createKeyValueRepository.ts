import { parseVersions } from '../internal/parseVersions.ts';
import { throwIfAborted } from '../internal/throwIfAborted.ts';
import { mergeVersions } from './mergeVersion.ts';
import type { KeyValueStore, SyncedRepository } from './ports.ts';

/** Options for `createKeyValueRepository`. */
export interface KeyValueRepositoryOptions {
  /** The key under which the document is stored, as one JSON array of versions. */
  key: string;
}

/**
 * Creates a `SyncedRepository` that keeps its document under one key of a `KeyValueStore`, so that each `apply` is
 * one write. The applies of one repository run one at a time, so that neither loses the other's versions; an apply
 * whose signal aborts while it waits rejects without writing. `load` throws a `TypeError` naming the key when the
 * stored value is not an array of versions.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function createKeyValueRepository(store: KeyValueStore, { key }: KeyValueRepositoryOptions): SyncedRepository {
  const source = `The value under the key ${JSON.stringify(key)}`;
  let queue: Promise<void> = Promise.resolve();

  return {
    async load(options) {
      throwIfAborted(options?.signal);
      return await readVersions();
    },
    async apply(versions, options) {
      throwIfAborted(options?.signal);
      const incoming = parseVersions(JSON.stringify(versions), 'The versions');
      const previous = queue;
      const write = (async () => {
        await previous;
        throwIfAborted(options?.signal);
        const merged = mergeVersions(await readVersions(), incoming);
        await store.setItem(key, JSON.stringify(merged));
      })();
      queue = settle(write);
      await write;
    },
  };

  async function readVersions() {
    const json = await store.getItem(key);
    return json === null || json === undefined ? [] : parseVersions(json, source);
  }
}

// region | Helpers
async function settle(promise: Promise<void>): Promise<void> {
  try {
    await promise;
  } catch {
    // Leave the failure to the caller that awaits the promise itself.
  }
}
// endregion | Helpers
