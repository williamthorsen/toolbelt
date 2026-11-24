import { copyVersions } from '../internal/copyVersions.ts';
import { createLock } from '../internal/createLock.ts';
import { isVersion } from '../internal/isVersion.ts';
import { parseDeviceRecord } from '../internal/parseDeviceRecord.ts';
import { isDeviceId } from '../internal/parseStamp.ts';
import { withTimeout } from '../internal/withTimeout.ts';
import { createKeyValueRepository } from './createKeyValueRepository.ts';
import { HybridClock } from './HybridClock.ts';
import { formatUnitKey, mergeVersion } from './mergeVersion.ts';
import type { StoreSchema, StoreState, SyncedStore, SyncedStoreOptions } from './storeTypes.ts';
import type { Version } from './types.ts';

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

/** What the store holds in memory once it has loaded from storage. */
interface Device {
  clock: HybridClock;
  deviceId: string;
  /** The latest unsent version of each unit, by unit key. */
  outbox: ReadonlyMap<string, Version>;
  state: StoreState<StoreSchema>;
  units: ReadonlyMap<string, Version>;
}

/**
 * Creates a store that keeps a document on the device and syncs it with a remote. A write is stored on the device
 * and queued in an outbox, and resolves without waiting for the remote. A sync sends the outbox, then merges the
 * remote's document into the device's; it holds no lock while a request is pending, and each request fails after
 * `requestTimeoutMs`. The store syncs after each write and on each call to `sync`, and does not retry on its own.
 *
 * Creating the store touches neither storage nor the remote: The first `read`, `write`, or `sync` loads the device's
 * data. That load rejects with a `TypeError` while a stored value is malformed, and the store never overwrites one,
 * since that would discard unsent changes; removing the keys `{key}/device` and `{key}/replica` resets the device.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function createSyncedStore<TSchema extends StoreSchema>({
  key,
  storage,
  remote,
  requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  createDeviceId = createRandomDeviceId,
  now,
}: SyncedStoreOptions): SyncedStore<TSchema> {
  const deviceKey = `${key}/device`;
  const replica = createKeyValueRepository(storage, { key: `${key}/replica` });
  const lock = createLock();
  const listeners = new Set<(state: StoreState<TSchema>) => void>();
  let device: Device | undefined;
  let syncError: unknown;
  let activeRun: Promise<void> | undefined;
  let queuedRun: Promise<void> | undefined;

  return {
    async read() {
      const { state } = device ?? (await lock.run(loadDevice));
      return narrowState(state);
    },
    async write(changes) {
      if (changes.length === 0) return;
      await lock.run(async () => {
        const current = await loadDevice();
        const versions = copyVersions(changes.map((change) => buildVersion(change, current.clock.issue())));
        const outbox = mergeInto(current.outbox, versions).units;
        try {
          await saveDeviceRecord(current, outbox);
          await replica.apply(versions);
        } catch (error) {
          // Storage may hold the new outbox; the reload on next use repairs the replica from it.
          device = undefined;
          throw error;
        }
        replaceDevice({ ...current, outbox, units: mergeInto(current.units, versions).units });
      });
      notify();
      // A failed sync is recorded in the state's `syncError`.
      void settle(sync());
    },
    sync,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };

  function sync(): Promise<void> {
    // Join a queued run also in the gap after the active run settles and before the queued run begins.
    if (queuedRun !== undefined) return queuedRun;
    const active = activeRun;
    if (active === undefined) return beginRun();
    queuedRun ??= (async () => {
      await settle(active);
      queuedRun = undefined;
      await beginRun();
    })();
    return queuedRun;
  }

  function beginRun(): Promise<void> {
    activeRun = (async () => {
      try {
        await runSync();
      } finally {
        // A run begins only while none is active, so the run that settles is the active one.
        activeRun = undefined;
      }
    })();
    return activeRun;
  }

  async function runSync(): Promise<void> {
    try {
      await sendOutbox();
      await pullRemote();
      setSyncError(undefined);
    } catch (error) {
      setSyncError(error);
      throw error;
    }
  }

  async function sendOutbox(): Promise<void> {
    const sent = await lock.run(async () => Array.from((await loadDevice()).outbox.values()));
    if (sent.length === 0) return;
    await withTimeout((signal) => remote.apply(sent, { signal }), requestTimeoutMs);
    await lock.run(async () => {
      const current = await loadDevice();
      const outbox = new Map(current.outbox);
      for (const version of sent) {
        const unitKey = formatUnitKey(version);
        if (outbox.get(unitKey)?.stamp === version.stamp) outbox.delete(unitKey);
      }
      await saveDeviceRecord(current, outbox);
      replaceDevice({ ...current, outbox });
    });
    notify();
  }

  async function pullRemote(): Promise<void> {
    const pulled = copyVersions(await withTimeout((signal) => remote.load({ signal }), requestTimeoutMs));
    const isChanged = await lock.run(async () => {
      const current = await loadDevice();
      const previousLast = current.clock.last;
      for (const version of pulled) current.clock.observe(version.stamp);
      const { units, changed } = mergeInto(current.units, pulled);
      if (changed.length > 0) await replica.apply(changed);
      if (current.clock.last !== previousLast) await saveDeviceRecord(current, current.outbox);
      if (changed.length === 0) return false;
      replaceDevice({ ...current, units });
      return true;
    });
    if (isChanged) notify();
  }

  /** Returns the loaded device, loading it from storage on first use; runs only inside the lock. */
  async function loadDevice(): Promise<Device> {
    if (device !== undefined) return device;
    const json = await storage.getItem(deviceKey);
    let record;
    if (json === null || json === undefined) {
      const deviceId = createDeviceId();
      if (!isDeviceId(deviceId)) {
        throw new TypeError(`A device id must be printable ASCII without spaces: ${JSON.stringify(deviceId)}`);
      }
      record = { deviceId, last: undefined, outbox: [] };
      await storage.setItem(deviceKey, JSON.stringify(record));
    } else {
      record = parseDeviceRecord(json, `The value under the key ${JSON.stringify(deviceKey)}`);
    }
    const clock = new HybridClock({ deviceId: record.deviceId, last: record.last, ...(now && { now }) });
    // Repair a write that stored its outbox entry but stopped before reaching the replica.
    if (record.outbox.length > 0) await replica.apply(record.outbox);
    const units = mergeInto(new Map(), await replica.load()).units;
    const outbox = mergeInto(new Map(), record.outbox).units;
    return replaceDevice({ clock, deviceId: record.deviceId, outbox, state: buildState(units, outbox.size), units });
  }

  /** Stores the device's id, its clock's state, and the outbox as one value, so that they change together. */
  async function saveDeviceRecord(current: Device, outbox: ReadonlyMap<string, Version>): Promise<void> {
    const record = { deviceId: current.deviceId, last: current.clock.last, outbox: Array.from(outbox.values()) };
    await storage.setItem(deviceKey, JSON.stringify(record));
  }

  /** Makes the device current, with a state built from its units and outbox, and returns it. */
  function replaceDevice(next: Device): Device {
    device = { ...next, state: buildState(next.units, next.outbox.size) };
    return device;
  }

  function buildState(units: ReadonlyMap<string, Version>, unsentCount: number): StoreState<StoreSchema> {
    const parts: Record<string, unknown> = {};
    const collections: Record<string, Map<string, unknown>> = {};
    // Copy the versions, so that a consumer that mutates a value does not change the store's.
    const copies = copyVersions(Array.from(units.values()));
    for (const version of copies) {
      if ('deleted' in version) continue;
      if (version.kind === 'part') {
        parts[version.name] = version.value;
      } else {
        const items = (collections[version.collection] ??= new Map());
        items.set(version.id, version.value);
      }
    }
    return Object.freeze({
      parts: Object.freeze(parts),
      collections: Object.freeze(collections),
      unsentCount,
      syncError,
    });
  }

  function setSyncError(error: unknown): void {
    if (error === syncError) return;
    syncError = error;
    if (device === undefined) return;
    replaceDevice(device);
    notify();
  }

  function notify(): void {
    if (device === undefined) return;
    const state = narrowState(device.state);
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (error) {
        // Report a listener's failure as an uncaught error, as `EventTarget` does, without stopping the others.
        queueMicrotask(() => {
          throw error;
        });
      }
    }
  }

  function narrowState(state: StoreState<StoreSchema>): StoreState<TSchema> {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- The store does not validate the values that it reads; `TSchema` states the consumer's claim about them.
    return state as StoreState<TSchema>;
  }
}

// region | Helpers
/** Returns a version of the change with the stamp, throwing a `TypeError` when it is not a version. */
function buildVersion(change: object, stamp: string): Version {
  const version: unknown = { ...change, stamp };
  if (!isVersion(version)) {
    throw new TypeError(`Not a change, or its value is not JSON: ${JSON.stringify(change)}`);
  }
  return version;
}

function createRandomDeviceId(): string {
  try {
    return crypto.randomUUID();
  } catch (error) {
    throw new TypeError('crypto.randomUUID is not available; pass a createDeviceId option to createSyncedStore', {
      cause: error,
    });
  }
}

/** Merges the versions into the units, and returns the result with the versions that changed it. */
function mergeInto(
  units: ReadonlyMap<string, Version>,
  versions: readonly Version[],
): { units: ReadonlyMap<string, Version>; changed: Version[] } {
  const merged = new Map(units);
  const changed: Version[] = [];
  for (const version of versions) {
    const unitKey = formatUnitKey(version);
    const current = merged.get(unitKey);
    const winner = mergeVersion(current, version);
    if (winner === current) continue;
    merged.set(unitKey, winner);
    changed.push(winner);
  }
  return { units: merged, changed };
}

async function settle(promise: Promise<void>): Promise<void> {
  try {
    await promise;
  } catch {
    // Leave the failure to the caller that awaits the promise itself.
  }
}
// endregion | Helpers
