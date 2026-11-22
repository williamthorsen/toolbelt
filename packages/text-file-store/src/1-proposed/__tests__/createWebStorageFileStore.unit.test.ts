import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMemoryStorage } from '../../test-utils/createMemoryStorage.ts';
import { createWebStorageFileStore } from '../createWebStorageFileStore.ts';

const PREFIX = 'test:files:';

describe(createWebStorageFileStore, () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime('2026-11-18T00:00:00.000Z');
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('writes a file under its prefixed key and reads it back', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);

    await expect(store.write('a.json', '{}\n', { replace: false })).resolves.toStrictEqual({ ok: true });
    await expect(store.read('a.json')).resolves.toStrictEqual({ ok: true, text: '{}\n' });
    expect(JSON.parse(storage.getItem(`${PREFIX}a.json`) ?? '')).toStrictEqual({
      text: '{}\n',
      modifiedAt: '2026-11-18T00:00:00.000Z',
    });
  });

  it('lists only its own files, newest first, skipping a value that does not parse', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);
    await store.write('old.json', '{}', { replace: false });
    vi.setSystemTime('2026-11-18T00:00:01.000Z');
    await store.write('new.json', '{}', { replace: false });
    storage.setItem(`${PREFIX}broken.json`, 'not json');
    storage.setItem('other:a.json', JSON.stringify({ text: '{}', modifiedAt: '2026-11-18T00:00:02.000Z' }));

    await expect(store.list()).resolves.toStrictEqual([
      { name: 'new.json', modifiedAt: '2026-11-18T00:00:01.000Z' },
      { name: 'old.json', modifiedAt: '2026-11-18T00:00:00.000Z' },
    ]);
  });

  it('keeps a name already held unless told to replace it', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);
    await store.write('a.json', 'first', { replace: false });

    await expect(store.write('a.json', 'second', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'exists',
      problems: [{ path: '', message: 'The store already holds a.json.' }],
    });
    await expect(store.read('a.json')).resolves.toStrictEqual({ ok: true, text: 'first' });
    await expect(store.write('a.json', 'second', { replace: true })).resolves.toStrictEqual({ ok: true });
    await expect(store.read('a.json')).resolves.toStrictEqual({ ok: true, text: 'second' });
  });

  it('reads a name not stored as missing and a value that does not parse as unavailable', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);
    storage.setItem(`${PREFIX}broken.json`, JSON.stringify({ text: 1 }));

    await expect(store.read('a.json')).resolves.toStrictEqual({
      ok: false,
      reason: 'missing',
      message: 'a.json is not stored.',
    });
    await expect(store.read('broken.json')).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('removes a stored file and reads the removal of a name not stored as missing', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);
    await store.write('a.json', '{}', { replace: false });

    await expect(store.remove('a.json')).resolves.toStrictEqual({ ok: true });
    await expect(store.read('a.json')).resolves.toMatchObject({ ok: false, reason: 'missing' });
    await expect(store.remove('a.json')).resolves.toStrictEqual({
      ok: false,
      reason: 'missing',
      message: 'a.json is not stored.',
    });
  });

  it('refuses a write over the storage quota and leaves the store usable', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);
    vi.spyOn(storage, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Full.', 'QuotaExceededError');
    });

    await expect(store.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'refused',
      problems: [
        { path: '', message: 'The browser’s storage for this page is full. Remove a stored file, then try again.' },
      ],
    });
    await expect(store.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({ ok: true });
  });

  it('reads every other throw from a write as unavailable', async () => {
    const store = createWebStorageFileStore(() => storage, PREFIX);
    vi.spyOn(storage, 'setItem').mockImplementation(() => {
      throw new DOMException('Denied.', 'SecurityError');
    });

    await expect(store.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      problems: [{ path: '', message: 'The browser does not let this page store files.' }],
    });
  });

  it('rejects a list and reports every other method as unavailable where the browser blocks storage', async () => {
    const store = createWebStorageFileStore(() => {
      throw new DOMException('Denied.', 'SecurityError');
    }, PREFIX);
    const unavailable = { ok: false, reason: 'unavailable' };

    await expect(store.list()).rejects.toThrow('does not let this page store files');
    await expect(store.read('a.json')).resolves.toMatchObject(unavailable);
    await expect(store.remove('a.json')).resolves.toMatchObject(unavailable);
    await expect(store.write('a.json', '{}', { replace: false })).resolves.toMatchObject(unavailable);
  });
});
