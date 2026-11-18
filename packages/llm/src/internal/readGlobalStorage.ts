import type { KeyValueStorage } from '../types/credential.ts';

/**
 * Returns the browser's storage of that name, and throws when the runtime does not have one.
 *
 * @internal
 */
export function readGlobalStorage(name: 'localStorage' | 'sessionStorage'): KeyValueStorage {
  const storage: unknown = Reflect.get(globalThis, name);
  if (!isKeyValueStorage(storage)) {
    throw new TypeError(`The runtime does not provide \`${name}\`; pass a storage in the options.`);
  }
  return storage;
}

// region | Helpers
/** Checks that a value has the storage methods that the package calls. */
function isKeyValueStorage(value: unknown): value is KeyValueStorage {
  if (typeof value !== 'object' || value === null) return false;
  return ['getItem', 'setItem', 'removeItem'].every((method) => typeof Reflect.get(value, method) === 'function');
}
// endregion | Helpers
