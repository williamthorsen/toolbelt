import { describe, expect, expectTypeOf, it } from 'vitest';

import { createKeychainStore } from '../createKeychainStore.ts';
import type { WritableSecretStore } from '../SecretStore.ts';

// Construction reaches `process.platform` alone, but it throws off macOS, where the type assertions below are
// still checked.
describe.skipIf(process.platform !== 'darwin')(createKeychainStore, () => {
  it('opens the default search list as a store that writes', () => {
    const store = createKeychainStore();

    expectTypeOf(store).toEqualTypeOf<WritableSecretStore>();
    expect(store.setSecret).toBeTypeOf('function');
  });

  it('opens a named keychain as a store that writes too', () => {
    const store = createKeychainStore({ keychain: '/tmp/project.keychain-db' });

    expectTypeOf(store).toEqualTypeOf<WritableSecretStore>();
    expect(store.setSecret).toBeTypeOf('function');
  });
});
