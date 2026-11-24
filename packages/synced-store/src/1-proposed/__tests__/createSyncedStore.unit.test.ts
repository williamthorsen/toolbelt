import { afterEach, describe, expect, it, vi } from 'vitest';

import { createSwitchableRemote } from '../../test-utils/createSwitchableRemote.ts';
import { createMemoryKeyValueStore } from '../createMemoryKeyValueStore.ts';
import { createMemoryRepository } from '../createMemoryRepository.ts';
import { createSyncedStore } from '../createSyncedStore.ts';
import type { KeyValueStore, SyncedRepository } from '../ports.ts';
import type { StoreState, SyncedStoreOptions } from '../storeTypes.ts';

interface GameSchema {
  parts: { names: { player: string } };
  collections: { entries: { score: number } };
}

const KEY = 'game';

describe(createSyncedStore, () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('touches neither storage nor the remote until its first use', async () => {
    const calls: string[] = [];
    const storage = watchStorage(createMemoryKeyValueStore(), calls);
    const remote = watchRemote(createMemoryRepository(), calls);

    const store = createSyncedStore<GameSchema>(buildOptions({ storage, remote }));
    expect(calls).toStrictEqual([]);

    await store.read();
    expect(calls).toContain('getItem game/device');
  });

  it('keeps an offline write on the device across a restart, and sends it once the remote is reachable', async () => {
    const storage = createMemoryKeyValueStore();
    const inner = createMemoryRepository();
    const remote = createSwitchableRemote(inner);
    remote.mode = 'offline';
    const first = createSyncedStore<GameSchema>(buildOptions({ storage, remote, deviceId: 'a' }));

    await first.write([{ kind: 'part', name: 'names', value: { player: 'Ann' } }]);
    await expect(first.sync()).rejects.toThrow('The remote is offline');
    expect((await first.read()).parts.names).toStrictEqual({ player: 'Ann' });

    const restarted = createSyncedStore<GameSchema>(buildOptions({ storage, remote, deviceId: 'b' }));
    await expect(restarted.read()).resolves.toMatchObject({ parts: { names: { player: 'Ann' } }, unsentCount: 1 });

    remote.mode = 'online';
    await restarted.sync();

    expect((await restarted.read()).unsentCount).toBe(0);
    await expect(inner.load()).resolves.toMatchObject([{ kind: 'part', name: 'names', value: { player: 'Ann' } }]);
  });

  it('converges two devices that wrote while offline', async () => {
    const remote = createSwitchableRemote(createMemoryRepository());
    const a = createSyncedStore<GameSchema>(buildOptions({ remote, deviceId: 'a', now: () => 1000 }));
    const b = createSyncedStore<GameSchema>(buildOptions({ remote, deviceId: 'b', now: () => 2000 }));
    remote.mode = 'online';
    await a.write([{ kind: 'item', collection: 'entries', id: 'e1', value: { score: 1 } }]);
    await a.sync();
    await b.sync();
    remote.mode = 'offline';

    await a.write([
      { kind: 'item', collection: 'entries', id: 'e1', deleted: true },
      { kind: 'part', name: 'names', value: { player: 'Ann' } },
    ]);
    await b.write([
      { kind: 'item', collection: 'entries', id: 'e1', value: { score: 5 } },
      { kind: 'item', collection: 'entries', id: 'e2', value: { score: 2 } },
      { kind: 'part', name: 'names', value: { player: 'Bob' } },
    ]);

    remote.mode = 'online';
    await a.sync();
    await b.sync();
    await a.sync();

    const stateA = await a.read();
    const stateB = await b.read();
    expect(stateA.parts).toStrictEqual(stateB.parts);
    expect(stateA.collections).toStrictEqual(stateB.collections);
    expect(stateA.parts.names).toStrictEqual({ player: 'Bob' });
    expect(stateA.collections.entries).toStrictEqual(new Map([['e2', { score: 2 }]]));
  });

  it('fails a request that does not answer in time, while a write in the meantime completes', async () => {
    vi.useFakeTimers();
    const remote = createSwitchableRemote(createMemoryRepository());
    const store = createSyncedStore<GameSchema>(buildOptions({ remote, requestTimeoutMs: 1000 }));
    await store.read();
    remote.mode = 'hung';

    const syncing = store.sync();
    await vi.advanceTimersByTimeAsync(0);
    await store.write([{ kind: 'part', name: 'names', value: { player: 'Ann' } }]);
    expect((await store.read()).parts.names).toStrictEqual({ player: 'Ann' });

    await Promise.all([
      expect(syncing).rejects.toMatchObject({ name: 'TimeoutError' }),
      vi.advanceTimersByTimeAsync(1000),
    ]);
    expect((await store.read()).syncError).toMatchObject({ name: 'TimeoutError' });
  });

  it('applies changes written together all at once, or rejects and changes nothing', async () => {
    const storage = createMemoryKeyValueStore();
    const remote = createSwitchableRemote(createMemoryRepository());
    remote.mode = 'offline';
    const store = createSyncedStore<GameSchema>(buildOptions({ storage, remote }));
    const before = await store.read();
    const stored = await storage.getItem('game/device');

    await expect(
      store.write([
        { kind: 'part', name: 'names', value: { player: 'Ann' } },
        { kind: 'item', collection: 'entries', id: 'e1', value: { score: NaN } },
      ]),
    ).rejects.toThrow(TypeError);

    await expect(store.read()).resolves.toBe(before);
    await expect(storage.getItem('game/device')).resolves.toBe(stored);
    await expect(storage.getItem('game/replica')).resolves.toBeUndefined();
  });

  it('counts the units with unsent changes, keeping a change written during a send', async () => {
    const inner = createMemoryRepository();
    const gate = Promise.withResolvers<undefined>();
    const remote: SyncedRepository = {
      async apply(versions, options) {
        await gate.promise;
        await inner.apply(versions, options);
      },
      load: (options) => inner.load(options),
    };
    const store = createSyncedStore<GameSchema>(buildOptions({ remote }));
    const counts: number[] = [];
    store.subscribe((state) => {
      counts.push(state.unsentCount);
    });

    await store.write([
      { kind: 'part', name: 'names', value: { player: 'Ann' } },
      { kind: 'item', collection: 'entries', id: 'e1', value: { score: 1 } },
    ]);
    await store.write([{ kind: 'part', name: 'names', value: { player: 'Bob' } }]);
    gate.resolve(undefined);
    await store.sync();

    expect(counts).toStrictEqual([2, 2, 1, 0]);
    await expect(inner.load()).resolves.toContainEqual(expect.objectContaining({ value: { player: 'Bob' } }));
  });

  it('notifies listeners when a sync pulls another device’s change, and not when a sync changes nothing', async () => {
    const remote = createSwitchableRemote(createMemoryRepository());
    const a = createSyncedStore<GameSchema>(buildOptions({ remote, deviceId: 'a' }));
    const b = createSyncedStore<GameSchema>(buildOptions({ remote, deviceId: 'b' }));
    await b.sync();
    const received: StoreState<GameSchema>[] = [];
    b.subscribe((state) => {
      received.push(state);
    });

    await b.sync();
    expect(received).toStrictEqual([]);

    await a.write([{ kind: 'part', name: 'names', value: { player: 'Ann' } }]);
    await a.sync();
    await b.sync();

    expect(received.at(-1)?.parts.names).toStrictEqual({ player: 'Ann' });
    expect(received.at(-1)).toBe(await b.read());
  });

  it('returns the same state until something changes', async () => {
    const store = createSyncedStore<GameSchema>(buildOptions({}));

    const first = await store.read();
    await expect(store.read()).resolves.toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('shares one follow-up run among the callers that arrive during a sync', async () => {
    const inner = createMemoryRepository();
    let loads = 0;
    const remote: SyncedRepository = {
      apply: (versions, options) => inner.apply(versions, options),
      load(options) {
        loads += 1;
        return inner.load(options);
      },
    };
    const store = createSyncedStore<GameSchema>(buildOptions({ remote }));
    await store.read();

    const runs = [store.sync(), store.sync(), store.sync()];

    expect(runs[1]).toBe(runs[2]);
    await Promise.all(runs);
    expect(loads).toBe(2);
  });

  it('joins the queued run when called after the active run settles and before the queued run begins', async () => {
    const inner = createMemoryRepository();
    let loads = 0;
    const remote: SyncedRepository = {
      apply: (versions, options) => inner.apply(versions, options),
      load(options) {
        loads += 1;
        return inner.load(options);
      },
    };
    const store = createSyncedStore<GameSchema>(buildOptions({ remote }));
    await store.read();

    const first = store.sync();
    // Awaits `first` before the queued run does, so its call lands in the gap between the two runs.
    const late = (async () => {
      await first;
      await store.sync();
    })();
    const queued = store.sync();

    await Promise.all([first, late, queued]);
    expect(loads).toBe(2);
  });

  it('keeps on the device a write whose replica write fails after its outbox entry is stored', async () => {
    const storage = createMemoryKeyValueStore();
    let isReplicaFailing = false;
    const failing: KeyValueStore = {
      getItem: (key) => storage.getItem(key),
      async setItem(key, value) {
        if (isReplicaFailing && key === 'game/replica') throw new Error('Quota exceeded');
        await storage.setItem(key, value);
      },
      removeItem: (key) => storage.removeItem(key),
    };
    const remote = createSwitchableRemote(createMemoryRepository());
    remote.mode = 'offline';
    const store = createSyncedStore<GameSchema>(buildOptions({ storage: failing, remote }));

    isReplicaFailing = true;
    await expect(store.write([{ kind: 'part', name: 'names', value: { player: 'Ann' } }])).rejects.toThrow(
      'Quota exceeded',
    );
    isReplicaFailing = false;
    await store.write([{ kind: 'item', collection: 'entries', id: 'e1', value: { score: 1 } }]);

    await expect(store.read()).resolves.toMatchObject({ parts: { names: { player: 'Ann' } }, unsentCount: 2 });
  });

  it('rejects the first use with a TypeError while the stored device record is malformed', async () => {
    const storage = createMemoryKeyValueStore();
    await storage.setItem('game/device', '{');
    const store = createSyncedStore<GameSchema>(buildOptions({ storage }));

    await expect(store.read()).rejects.toThrow(TypeError);
    await expect(store.read()).rejects.toThrow(TypeError);
  });
});

// region | Helpers
interface TestOptions {
  storage?: KeyValueStore;
  remote?: SyncedRepository;
  deviceId?: string;
  requestTimeoutMs?: number;
  now?: () => number;
}

function buildOptions({ storage, remote, deviceId = 'a', requestTimeoutMs, now }: TestOptions): SyncedStoreOptions {
  return {
    key: KEY,
    storage: storage ?? createMemoryKeyValueStore(),
    remote: remote ?? createMemoryRepository(),
    createDeviceId: () => deviceId,
    requestTimeoutMs,
    now,
  };
}

function watchRemote(remote: SyncedRepository, calls: string[]): SyncedRepository {
  return {
    load(options) {
      calls.push('load');
      return remote.load(options);
    },
    apply(versions, options) {
      calls.push('apply');
      return remote.apply(versions, options);
    },
  };
}

function watchStorage(storage: KeyValueStore, calls: string[]): KeyValueStore {
  return {
    getItem(key) {
      calls.push(`getItem ${key}`);
      return storage.getItem(key);
    },
    setItem(key, value) {
      calls.push(`setItem ${key}`);
      return storage.setItem(key, value);
    },
    removeItem(key) {
      calls.push(`removeItem ${key}`);
      return storage.removeItem(key);
    },
  };
}
// endregion | Helpers
