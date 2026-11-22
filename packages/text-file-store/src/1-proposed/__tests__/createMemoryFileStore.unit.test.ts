import { describe, expect, it } from 'vitest';

import { createMemoryFileStore } from '../createMemoryFileStore.ts';

describe(createMemoryFileStore, () => {
  it('lists the seeded files newest first, the last one given the newest', async () => {
    const store = createMemoryFileStore({ 'a.md': 'A', 'b.md': 'B' });

    await expect(store.list()).resolves.toStrictEqual([
      { name: 'b.md', modifiedAt: '2026-01-01T00:00:02.000Z' },
      { name: 'a.md', modifiedAt: '2026-01-01T00:00:01.000Z' },
    ]);
  });

  it('makes a replaced file the newest', async () => {
    const store = createMemoryFileStore({ 'a.md': 'A', 'b.md': 'B' });

    await expect(store.write('a.md', 'A2', { replace: true })).resolves.toStrictEqual({ ok: true });
    await expect(store.list()).resolves.toMatchObject([{ name: 'a.md' }, { name: 'b.md' }]);
    await expect(store.read('a.md')).resolves.toStrictEqual({ ok: true, text: 'A2' });
  });

  it('keeps a name already held unless told to replace it', async () => {
    const store = createMemoryFileStore({ 'a.md': 'first' });

    await expect(store.write('a.md', 'second', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'exists',
      problems: [{ path: '', message: 'The store already holds a.md.' }],
    });
    await expect(store.read('a.md')).resolves.toStrictEqual({ ok: true, text: 'first' });
  });

  it('removes a stored file and reads a name not stored as missing', async () => {
    const store = createMemoryFileStore({ 'a.md': 'A' });
    const missing = { ok: false, reason: 'missing', message: 'a.md is not stored.' };

    await expect(store.remove('a.md')).resolves.toStrictEqual({ ok: true });
    await expect(store.read('a.md')).resolves.toStrictEqual(missing);
    await expect(store.remove('a.md')).resolves.toStrictEqual(missing);
  });

  it('rejects a list and reports every other method as unavailable while unreachable', async () => {
    const store = createMemoryFileStore({ 'a.md': 'A' });
    store.isUnreachable = true;
    const message = 'The store could not be reached.';

    await expect(store.list()).rejects.toThrow(message);
    await expect(store.read('a.md')).resolves.toStrictEqual({ ok: false, reason: 'unavailable', message });
    await expect(store.remove('a.md')).resolves.toStrictEqual({ ok: false, reason: 'unavailable', message });
    await expect(store.write('b.md', 'B', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      problems: [{ path: '', message }],
    });

    store.isUnreachable = false;

    await expect(store.list()).resolves.toMatchObject([{ name: 'a.md' }]);
  });
});
