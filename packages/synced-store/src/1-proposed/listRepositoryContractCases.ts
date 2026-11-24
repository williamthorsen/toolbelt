import { assertContractRejects, assertSameVersions } from '../internal/assertContract.ts';
import type { SyncedRepository } from './ports.ts';
import type { ContractCase, ItemTombstone, ItemVersion, PartVersion } from './types.ts';

const OLDER = '2026-11-24T14:40:07.123Z_0000_device-a';
const NEWER = '2026-11-24T14:40:08.000Z_0000_device-b';

/**
 * Lists the checks that every implementation of `SyncedRepository` passes, whether a replica or a remote. Register
 * each with a test runner: `for (const c of cases) it(c.name, () => c.run(createRepository))`.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function listRepositoryContractCases(): readonly ContractCase<SyncedRepository>[] {
  return [
    {
      name: 'loads nothing from an empty document',
      async run(create) {
        const repository = await create();

        assertSameVersions(await repository.load(), [], 'The load of an empty document');
      },
    },
    {
      name: 'loads each applied part, item, and tombstone with its value intact',
      async run(create) {
        const repository = await create();
        const versions = [
          buildPart('rulebook', OLDER, { tithe: [10, { note: 'weekly' }], open: true, cap: null, rate: 1.5 }),
          buildItem(OLDER, 'pledge'),
          buildTombstone('entry-2'),
        ];

        await repository.apply(versions);

        assertSameVersions(await repository.load(), versions, 'The load after an apply');
      },
    },
    {
      name: 'keeps the later edit when it arrives last',
      async run(create) {
        const repository = await create();
        const newer = buildItem(NEWER, 'newer');

        await repository.apply([buildItem(OLDER, 'older')]);
        await repository.apply([newer]);

        assertSameVersions(await repository.load(), [newer], 'The load after the later edit arrived last');
      },
    },
    {
      name: 'keeps the later edit when it arrives first',
      async run(create) {
        const repository = await create();
        const newer = buildItem(NEWER, 'newer');

        await repository.apply([newer]);
        await repository.apply([buildItem(OLDER, 'older')]);

        assertSameVersions(await repository.load(), [newer], 'The load after the later edit arrived first');
      },
    },
    {
      name: 'keeps the later edit of two in one batch, in either order',
      async run(create) {
        const repository = await create();
        const newerPart = buildPart('names', NEWER, 'newer');
        const newerItem = buildItem(NEWER, 'newer');

        await repository.apply([buildPart('names', OLDER, 'older'), newerPart, newerItem, buildItem(OLDER, 'older')]);

        assertSameVersions(await repository.load(), [newerPart, newerItem], 'The load after one batch');
      },
    },
    {
      name: 'keeps a deletion over a later amendment that arrives after it',
      async run(create) {
        const repository = await create();
        const tombstone = buildTombstone('entry-1');

        await repository.apply([tombstone]);
        await repository.apply([buildItem(NEWER, 'amended')]);

        assertSameVersions(await repository.load(), [tombstone], 'The load after an amendment of a deleted item');
      },
    },
    {
      name: 'keeps a deletion over a later amendment that arrived before it',
      async run(create) {
        const repository = await create();
        const tombstone = buildTombstone('entry-1');

        await repository.apply([buildItem(NEWER, 'amended')]);
        await repository.apply([tombstone]);

        assertSameVersions(await repository.load(), [tombstone], 'The load after a deletion of an amended item');
      },
    },
    {
      name: 'keeps the parts of a document independent',
      async run(create) {
        const repository = await create();
        const names = buildPart('names', NEWER, { player: 'Ann' });
        const rulebook = buildPart('rulebook', OLDER, { tithe: 10 });

        await repository.apply([names]);
        await repository.apply([rulebook]);

        assertSameVersions(await repository.load(), [names, rulebook], 'The load after saving two parts');
      },
    },
    {
      name: 'loads the same document after a batch is applied again',
      async run(create) {
        const repository = await create();
        const versions = [buildPart('names', OLDER, 'names'), buildItem(NEWER, 'pledge')];

        await repository.apply(versions);
        await repository.apply(versions);

        assertSameVersions(await repository.load(), versions, 'The load after applying a batch twice');
      },
    },
    {
      name: 'rejects a call whose signal is already aborted, and changes nothing',
      async run(create) {
        const repository = await create();
        const controller = new AbortController();
        controller.abort();

        await assertContractRejects(
          repository.apply([buildItem(OLDER, 'pledge')], { signal: controller.signal }),
          'An apply with an aborted signal',
        );
        await assertContractRejects(repository.load({ signal: controller.signal }), 'A load with an aborted signal');

        assertSameVersions(await repository.load(), [], 'The load after an aborted apply');
      },
    },
  ];
}

// region | Helpers
function buildItem(stamp: string, value: ItemVersion['value']): ItemVersion {
  return { kind: 'item', collection: 'entries', id: 'entry-1', stamp, value };
}

function buildPart(name: string, stamp: string, value: PartVersion['value']): PartVersion {
  return { kind: 'part', name, stamp, value };
}

function buildTombstone(id: string): ItemTombstone {
  return { kind: 'item', collection: 'entries', id, stamp: OLDER, deleted: true };
}
// endregion | Helpers
