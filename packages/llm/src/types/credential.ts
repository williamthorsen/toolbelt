/**
 * A provider credential that a user supplies, by pasting a key or through a connect flow. Adding a `model` makes it a
 * `ProviderConnection`: `runJob(job, { ...credential, model })`.
 */
export type UserCredential =
  | { readonly provider: 'anthropic'; readonly apiKey: string }
  | { readonly provider: 'google' | 'openai' | 'openrouter'; readonly apiKey: string };

/** The part of the Web Storage API that the credential store and the connect flow use. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Where `createCredentialStore` keeps the credential of one app. */
export interface CredentialStoreOptions {
  /** Names the app's entry, which is kept under `toolbelt.llm:{name}`. */
  readonly name: string;
  /** The storage for a credential kept for the tab's session; the browser's `sessionStorage` by default. */
  readonly sessionStorage?: KeyValueStorage;
  /** The storage for a remembered credential; the browser's `localStorage` by default. */
  readonly localStorage?: KeyValueStorage;
}

/** Reads, saves, and forgets one app's credential. */
export interface CredentialStore {
  /** Returns the saved credential, preferring the session's copy, or `undefined` when none can be read. */
  read(): UserCredential | undefined;
  /**
   * Saves the credential for the tab's session, or in the browser when `remember` is true, replacing any other copy.
   */
  save(credential: UserCredential, options: { readonly remember: boolean }): void;
  /** Removes the credential from both storages. */
  forget(): void;
}
