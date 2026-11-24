import { parseVersions } from '../internal/parseVersions.ts';
import { throwIfAborted } from '../internal/throwIfAborted.ts';
import { formatUnitKey, mergeVersion } from './mergeVersion.ts';
import type { SyncedRepository } from './ports.ts';
import type { Version } from './types.ts';

/**
 * Creates a `SyncedRepository` that keeps its document in memory, copying each version on the way in and out. `apply`
 * rejects with a `TypeError`, and changes nothing, when a version is malformed or its value is not JSON.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function createMemoryRepository(initial: readonly Version[] = []): SyncedRepository {
  const units = new Map<string, Version>();
  merge(initial);

  return {
    load(options) {
      return Promise.try(() => {
        throwIfAborted(options?.signal);
        return copyVersions(Array.from(units.values()));
      });
    },
    apply(versions, options) {
      return Promise.try(() => {
        throwIfAborted(options?.signal);
        merge(versions);
      });
    },
  };

  function merge(versions: readonly Version[]): void {
    for (const version of copyVersions(versions)) {
      const key = formatUnitKey(version);
      units.set(key, mergeVersion(units.get(key), version));
    }
  }
}

// region | Helpers
function copyVersions(versions: readonly Version[]): Version[] {
  return parseVersions(JSON.stringify(versions), 'The versions');
}
// endregion | Helpers
