import { assertContractEqual } from '../internal/assertContract.ts';
import type { KeyValueStore } from './ports.ts';
import type { ContractCase } from './types.ts';

/**
 * Lists the checks that every implementation of `KeyValueStore` passes. Register each with a test runner:
 * `for (const c of cases) it(c.name, () => c.run(createStore))`.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function listKeyValueStoreContractCases(): readonly ContractCase<KeyValueStore>[] {
  return [
    {
      name: 'reads a missing key as null or undefined',
      async run(create) {
        const store = await create();

        assertContractEqual((await store.getItem('missing')) ?? undefined, undefined, 'The read of a missing key');
      },
    },
    {
      name: 'reads back the value set under a key',
      async run(create) {
        const store = await create();

        await store.setItem('outbox', '[1,2]');
        await store.setItem('clock', 'stamp');

        assertContractEqual(await store.getItem('outbox'), '[1,2]', 'The read of a key after a set');
      },
    },
    {
      name: 'replaces the value of a key that is set again',
      async run(create) {
        const store = await create();

        await store.setItem('outbox', 'first');
        await store.setItem('outbox', 'second');

        assertContractEqual(await store.getItem('outbox'), 'second', 'The read of a key set twice');
      },
    },
    {
      name: 'reads a removed key as missing',
      async run(create) {
        const store = await create();

        await store.setItem('outbox', 'value');
        await store.removeItem('outbox');

        assertContractEqual((await store.getItem('outbox')) ?? undefined, undefined, 'The read of a removed key');
      },
    },
    {
      name: 'resolves on removing a missing key',
      async run(create) {
        const store = await create();

        await store.removeItem('missing');

        assertContractEqual((await store.getItem('missing')) ?? undefined, undefined, 'The read of a missing key');
      },
    },
  ];
}
