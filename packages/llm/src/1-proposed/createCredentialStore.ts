import { readGlobalStorage } from '../internal/readGlobalStorage.ts';
import type { CredentialStore, CredentialStoreOptions, KeyValueStorage, UserCredential } from '../types/credential.ts';

const PROVIDERS: ReadonlySet<unknown> = new Set(['anthropic', 'google', 'openai', 'openrouter']);

/**
 * Creates a store for one app's `UserCredential`. A credential saved without `remember` stays in `sessionStorage`,
 * which the browser clears when the tab closes; a remembered one goes to `localStorage`. Any script on the page can
 * read either. The browser's storages are read when a method is called, which throws when the runtime has none and
 * none was passed.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export function createCredentialStore(options: CredentialStoreOptions): CredentialStore {
  const key = `toolbelt.llm:${options.name}`;
  function readSession(): KeyValueStorage {
    return options.sessionStorage ?? readGlobalStorage('sessionStorage');
  }
  function readLocal(): KeyValueStorage {
    return options.localStorage ?? readGlobalStorage('localStorage');
  }

  return {
    read: () => parseCredential(readSession().getItem(key)) ?? parseCredential(readLocal().getItem(key)),
    save: (credential, { remember }) => {
      const [target, other] = remember ? [readLocal(), readSession()] : [readSession(), readLocal()];
      other.removeItem(key);
      target.setItem(key, JSON.stringify({ provider: credential.provider, apiKey: credential.apiKey }));
    },
    forget: () => {
      readSession().removeItem(key);
      readLocal().removeItem(key);
    },
  };
}

// region | Helpers
/** Returns the credential that an entry holds, or `undefined` when the entry is absent or not a credential. */
function parseCredential(entry: string | null): UserCredential | undefined {
  if (entry === null) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(entry);
  } catch {
    return undefined;
  }
  return isUserCredential(value) ? value : undefined;
}

/** Checks that a parsed value has a known provider and a key. */
function isUserCredential(value: unknown): value is UserCredential {
  if (typeof value !== 'object' || value === null) return false;
  return PROVIDERS.has(Reflect.get(value, 'provider')) && typeof Reflect.get(value, 'apiKey') === 'string';
}
// endregion | Helpers
