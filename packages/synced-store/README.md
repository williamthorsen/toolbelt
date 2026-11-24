<!-- readme-type: library -->

# @williamthorsen/toolbelt.synced-store

A store that works offline and converges across devices, over ports that the consumer implements.

<!-- section:release-notes --><!-- /section:release-notes -->

## Installation

```sh
pnpm add @williamthorsen/toolbelt.synced-store
```

Requires Node.js 24 or later.

## Usage

```ts
import { createMemoryRepository, HybridClock } from '@williamthorsen/toolbelt.synced-store/proposed';

const clock = new HybridClock({ deviceId: 'device-a' });
await createMemoryRepository().apply([{ kind: 'part', name: 'names', stamp: clock.issue(), value: { player: 'Ann' } }]);
```

The package keeps a document on the device and on a remote that the consumer already has, such as its own database functions. Unlike a sync engine, it does not own the data model or need a server of its own: The consumer implements two small ports, and a merge rule that a remote can apply in SQL decides every conflict.

The exports are in `/proposed`, which may change at any time. The store that adds an outbox and sync over these ports is tracked in [#795](https://github.com/williamthorsen/toolbelt/issues/795).

## Documents and versions

A document has named parts, each saved whole, and named collections of items keyed by id. Each part and each item is a unit, and the document is stored as one version per unit. Every version has a change stamp, which `HybridClock` issues; a deletion of an item is stored as a tombstone.

## The merge rule

`mergeVersion` decides between two versions of one unit:

- A tombstone beats any value, whatever their stamps: An amendment never restores a deleted item.
- Otherwise the version with the greater stamp wins, whichever arrives last.

The rule gives the same result for any order of the same versions, applied any number of times, so a replica and a remote that receive the same versions keep the same document.

## Ports

- `SyncedRepository` stores one document. The device's replica and the remote both implement it. `createMemoryRepository` keeps a document in memory, and `createKeyValueRepository` keeps it under one key of a `KeyValueStore`.
- `KeyValueStore` stores strings by key. AsyncStorage satisfies it as it is, and `createMemoryKeyValueStore` keeps its values in memory.

## The contract that a remote implements

- `load` returns the current version of every unit, tombstones included, in any order.
- `apply` merges a batch of versions under the merge rule, all or none.
- A stamp compares by its UTF-16 code units, as `compareStamps` does. In SQL, compare stamps with a binary collation, such as `COLLATE "C"` in PostgreSQL; another collation orders some stamps differently.
- A call whose signal is already aborted rejects and changes nothing.

`listRepositoryContractCases` and `listKeyValueStoreContractCases` return the checks that every implementation passes. They do not depend on a test runner; each check throws when the implementation fails it:

```ts
for (const contractCase of listRepositoryContractCases()) {
  it(contractCase.name, () => contractCase.run(createRemoteRepository));
}
```
