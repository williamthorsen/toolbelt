import type { FileStore, StoredFileEntry } from './FileStore.ts';

/**
 * Creates a store that keeps each file under the key `{keyPrefix}{name}` of a Web Storage area, as the JSON
 * `{ text, modifiedAt }`. `storage` is called on every access, because reading a storage area throws where the browser
 * blocks storage; a write over the area's quota is refused, and any other failure makes the store unavailable.
 *
 * @category File store
 * @stage proposed
 */
export function createWebStorageFileStore(storage: () => Storage, keyPrefix: string): FileStore {
  return {
    list() {
      const listed: StoredFileEntry[] = [];
      try {
        const area = storage();
        for (let index = 0; index < area.length; index += 1) {
          const key = area.key(index);
          if (key === null || !key.startsWith(keyPrefix)) continue;
          const stored = parseStoredFile(area.getItem(key));
          if (stored !== undefined) listed.push({ name: key.slice(keyPrefix.length), modifiedAt: stored.modifiedAt });
        }
      } catch {
        return Promise.reject(new Error(UNAVAILABLE_MESSAGE));
      }
      return Promise.resolve(listed.toSorted((a, b) => b.modifiedAt.localeCompare(a.modifiedAt)));
    },
    read(name) {
      let value: string | null;
      try {
        value = storage().getItem(`${keyPrefix}${name}`);
      } catch {
        return Promise.resolve({ ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE });
      }
      if (value === null) return Promise.resolve({ ok: false, reason: 'missing', message: `${name} is not stored.` });
      const stored = parseStoredFile(value);
      return Promise.resolve(
        stored === undefined
          ? { ok: false, reason: 'unavailable', message: `The store holds unexpected content for ${name}.` }
          : { ok: true, text: stored.text },
      );
    },
    remove(name) {
      const key = `${keyPrefix}${name}`;
      try {
        const area = storage();
        if (area.getItem(key) === null) {
          return Promise.resolve({ ok: false, reason: 'missing', message: `${name} is not stored.` });
        }
        area.removeItem(key);
      } catch {
        return Promise.resolve({ ok: false, reason: 'unavailable', message: UNAVAILABLE_MESSAGE });
      }
      return Promise.resolve({ ok: true });
    },
    write(name, text, { replace }) {
      const key = `${keyPrefix}${name}`;
      try {
        const area = storage();
        if (!replace && area.getItem(key) !== null) {
          return Promise.resolve({
            ok: false,
            reason: 'exists',
            problems: [{ path: '', message: `The store already holds ${name}.` }],
          });
        }
        area.setItem(key, JSON.stringify({ text, modifiedAt: new Date().toISOString() }));
      } catch (error) {
        return Promise.resolve(
          isQuotaError(error)
            ? { ok: false, reason: 'refused', problems: [{ path: '', message: QUOTA_MESSAGE }] }
            : { ok: false, reason: 'unavailable', problems: [{ path: '', message: UNAVAILABLE_MESSAGE }] },
        );
      }
      return Promise.resolve({ ok: true });
    },
  };
}

// region | Helpers
const QUOTA_MESSAGE = 'The browser’s storage for this page is full. Remove a stored file, then try again.';

const UNAVAILABLE_MESSAGE = 'The browser does not let this page store files.';

/** Reports whether the error is the one that a storage area throws for a write over its quota. */
function isQuotaError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError';
}

/** Returns the text and modification time of a stored value, or `undefined` when it is absent or malformed. */
function parseStoredFile(value: string | null): { text: string; modifiedAt: string } | undefined {
  if (value === null) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return undefined;
  }
  if (typeof parsed !== 'object' || parsed === null) return undefined;
  const text: unknown = 'text' in parsed ? parsed.text : undefined;
  const modifiedAt: unknown = 'modifiedAt' in parsed ? parsed.modifiedAt : undefined;
  return typeof text === 'string' && typeof modifiedAt === 'string' ? { text, modifiedAt } : undefined;
}
// endregion | Helpers
