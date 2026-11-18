import { afterEach, describe, expect, expectTypeOf, it, vi } from 'vitest';

import { createMemoryStorage } from '../../test-utils/createMemoryStorage.ts';
import type { UserCredential } from '../../types/credential.ts';
import type { ProviderConnection } from '../../types/job.ts';
import { createCredentialStore } from '../createCredentialStore.ts';

const KEY = 'toolbelt.llm:app';
const CREDENTIAL: UserCredential = { provider: 'openai', apiKey: 'sk-test' };

describe(createCredentialStore, () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps a credential for the session unless asked to remember it', () => {
    const { store, sessionStorage, localStorage } = buildStore();

    store.save(CREDENTIAL, { remember: false });

    expect(sessionStorage.entries.get(KEY)).toBe(JSON.stringify(CREDENTIAL));
    expect(localStorage.entries.has(KEY)).toBe(false);
    expect(store.read()).toStrictEqual(CREDENTIAL);
  });

  it('remembers a credential in local storage and drops the session copy', () => {
    const { store, sessionStorage, localStorage } = buildStore();
    store.save(CREDENTIAL, { remember: false });

    store.save({ provider: 'anthropic', apiKey: 'sk-ant' }, { remember: true });

    expect(sessionStorage.entries.has(KEY)).toBe(false);
    expect(localStorage.entries.get(KEY)).toBe(JSON.stringify({ provider: 'anthropic', apiKey: 'sk-ant' }));
    expect(store.read()).toStrictEqual({ provider: 'anthropic', apiKey: 'sk-ant' });
  });

  it('prefers the session copy over a remembered one', () => {
    const { store, localStorage } = buildStore();

    store.save(CREDENTIAL, { remember: false });
    localStorage.setItem(KEY, JSON.stringify({ provider: 'google', apiKey: 'remembered' }));

    expect(store.read()).toStrictEqual(CREDENTIAL);
  });

  it('forgets the credential in both storages', () => {
    const { store, sessionStorage, localStorage } = buildStore();
    sessionStorage.setItem(KEY, JSON.stringify(CREDENTIAL));
    localStorage.setItem(KEY, JSON.stringify(CREDENTIAL));

    store.forget();

    expect(store.read()).toBeUndefined();
    expect(sessionStorage.entries.size + localStorage.entries.size).toBe(0);
  });

  it.each([
    ['not JSON', '{'],
    ['an unknown provider', JSON.stringify({ provider: 'acme', apiKey: 'k' })],
    ['a missing key', JSON.stringify({ provider: 'openai' })],
    ['null', 'null'],
  ])('reads an entry that is %s as no credential', (_label, entry) => {
    const { store, localStorage } = buildStore();
    localStorage.setItem(KEY, entry);

    expect(store.read()).toBeUndefined();
  });

  it('keeps each app under its own name', () => {
    const { store, sessionStorage, localStorage } = buildStore();
    const other = createCredentialStore({ name: 'other', sessionStorage, localStorage });

    store.save(CREDENTIAL, { remember: false });

    expect(other.read()).toBeUndefined();
  });

  it('throws when the runtime has no storage and none was passed', () => {
    vi.stubGlobal('sessionStorage', undefined);
    vi.stubGlobal('localStorage', undefined);
    const store = createCredentialStore({ name: 'app' });

    expect(() => store.read()).toThrow(TypeError);
  });

  it('yields a provider connection once a model is added', () => {
    expectTypeOf<UserCredential & { readonly model: string }>().toExtend<ProviderConnection>();
  });
});

// region | Helpers
/** Builds a store over two fresh memory storages. */
function buildStore() {
  const sessionStorage = createMemoryStorage();
  const localStorage = createMemoryStorage();
  return { store: createCredentialStore({ name: 'app', sessionStorage, localStorage }), sessionStorage, localStorage };
}
// endregion | Helpers
