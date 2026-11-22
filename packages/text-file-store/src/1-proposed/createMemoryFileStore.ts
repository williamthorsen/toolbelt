import type { FileStore, StoredFileRead, StoredFileRemoval } from './FileStore.ts';

/** A store held in memory, which a caller can fill through `add` and make unreachable through `isUnreachable`. */
export interface MemoryFileStore extends FileStore {
  /** Stores the text under the name as the newest file, replacing a file of that name. */
  add: (name: string, text: string) => void;
  isUnreachable: boolean;
}

/**
 * Creates a store held in memory, with the files given, the last one the newest. Each added file is one second newer
 * than the last, from `2026-01-01T00:00:00.000Z`, so that its listing does not depend on the clock.
 *
 * @category File store
 * @stage proposed
 */
export function createMemoryFileStore(files: Record<string, string> = {}): MemoryFileStore {
  const entries = new Map<string, { text: string; modifiedMs: number }>();
  let clock = Date.parse('2026-01-01T00:00:00.000Z');
  const store: MemoryFileStore = {
    isUnreachable: false,
    add(name, text) {
      clock += 1000;
      entries.delete(name);
      entries.set(name, { text, modifiedMs: clock });
    },
    list() {
      if (store.isUnreachable) return Promise.reject(new Error(UNREACHABLE_MESSAGE));
      const listed = [...entries]
        .toSorted(([, a], [, b]) => b.modifiedMs - a.modifiedMs)
        .map(([name, { modifiedMs }]) => ({ name, modifiedAt: new Date(modifiedMs).toISOString() }));
      return Promise.resolve(listed);
    },
    read(name) {
      const entry = entries.get(name);
      let read: StoredFileRead;
      if (store.isUnreachable) read = { ok: false, reason: 'unavailable', message: UNREACHABLE_MESSAGE };
      else if (entry === undefined) read = { ok: false, reason: 'missing', message: `${name} is not stored.` };
      else read = { ok: true, text: entry.text };
      return Promise.resolve(read);
    },
    remove(name) {
      let removal: StoredFileRemoval;
      if (store.isUnreachable) removal = { ok: false, reason: 'unavailable', message: UNREACHABLE_MESSAGE };
      else if (entries.delete(name)) removal = { ok: true };
      else removal = { ok: false, reason: 'missing', message: `${name} is not stored.` };
      return Promise.resolve(removal);
    },
    write(name, text, { replace }) {
      if (store.isUnreachable) {
        return Promise.resolve({
          ok: false,
          reason: 'unavailable',
          problems: [{ path: '', message: UNREACHABLE_MESSAGE }],
        });
      }
      if (!replace && entries.has(name)) {
        return Promise.resolve({
          ok: false,
          reason: 'exists',
          problems: [{ path: '', message: `The store already holds ${name}.` }],
        });
      }
      store.add(name, text);
      return Promise.resolve({ ok: true });
    },
  };
  for (const [name, text] of Object.entries(files)) store.add(name, text);
  return store;
}

// region | Helpers
const UNREACHABLE_MESSAGE = 'The store could not be reached.';
// endregion | Helpers
