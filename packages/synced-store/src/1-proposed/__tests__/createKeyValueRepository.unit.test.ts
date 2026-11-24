import { describe, expect, it } from 'vitest';

import { createKeyValueRepository } from '../createKeyValueRepository.ts';
import { createMemoryKeyValueStore } from '../createMemoryKeyValueStore.ts';
import type { KeyValueStore } from '../ports.ts';
import type { Version } from '../types.ts';

const KEY = 'replica';
const STAMP = '2026-11-24T14:40:07.123Z_0000_a';

describe(createKeyValueRepository, () => {
  it('does not touch the store until its first load or apply', () => {
    const calls: string[] = [];
    const watched: KeyValueStore = {
      getItem(key) {
        calls.push(`getItem ${key}`);
        return Promise.resolve(undefined);
      },
      setItem(key) {
        calls.push(`setItem ${key}`);
        return Promise.resolve();
      },
      removeItem(key) {
        calls.push(`removeItem ${key}`);
        return Promise.resolve();
      },
    };

    createKeyValueRepository(watched, { key: KEY });

    expect(calls).toStrictEqual([]);
  });

  it('keeps both of two concurrent applies', async () => {
    const repository = createKeyValueRepository(createMemoryKeyValueStore(), { key: KEY });
    const names = buildPart('names');
    const rulebook = buildPart('rulebook');

    await Promise.all([repository.apply([names]), repository.apply([rulebook])]);

    await expect(repository.load()).resolves.toStrictEqual([names, rulebook]);
  });

  it('loads in a second repository over the same store what the first applied', async () => {
    const store = createMemoryKeyValueStore();
    const names = buildPart('names');
    await createKeyValueRepository(store, { key: KEY }).apply([names]);

    await expect(createKeyValueRepository(store, { key: KEY }).load()).resolves.toStrictEqual([names]);
  });

  it('rejects without writing an apply whose signal aborts while it waits', async () => {
    const repository = createKeyValueRepository(createMemoryKeyValueStore(), { key: KEY });
    const controller = new AbortController();
    const first = repository.apply([buildPart('names')]);
    const second = repository.apply([buildPart('rulebook')], { signal: controller.signal });

    controller.abort();

    await first;
    await expect(second).rejects.toBe(controller.signal.reason);
    await expect(repository.load()).resolves.toStrictEqual([buildPart('names')]);
  });

  it('throws an error naming the key when the stored value is not an array of versions', async () => {
    const store = createMemoryKeyValueStore();
    await store.setItem(KEY, '{');

    await expect(createKeyValueRepository(store, { key: KEY }).load()).rejects.toThrow(/"replica"/u);
  });

  it('rejects a malformed version without writing', async () => {
    const store = createMemoryKeyValueStore();
    const repository = createKeyValueRepository(store, { key: KEY });
    const malformed: Version = { kind: 'part', name: 'names', stamp: 'now', value: null };

    await expect(repository.apply([malformed])).rejects.toThrow(TypeError);

    await expect(store.getItem(KEY)).resolves.toBeUndefined();
  });
});

// region | Helpers
function buildPart(name: string): Version {
  return { kind: 'part', name, stamp: STAMP, value: name };
}
// endregion | Helpers
