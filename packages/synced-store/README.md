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
import {
  createMemoryKeyValueStore,
  createMemoryRepository,
  createSyncedStore,
} from '@williamthorsen/toolbelt.synced-store/proposed';

const store = createSyncedStore<{ parts: { names: { player: string } }; collections: {} }>({
  key: 'game',
  storage: createMemoryKeyValueStore(), // AsyncStorage on a device
  remote: createMemoryRepository(), // the consumer's own SyncedRepository
});
await store.write([{ kind: 'part', name: 'names', value: { player: 'Ann' } }]);
const { parts, unsentCount } = await store.read();
```

The package keeps a document on the device and on a remote that the consumer already has, such as its own database functions. Unlike a sync engine, it does not own the data model or need a server of its own: The consumer implements two small ports, and a merge rule that a remote can apply in SQL decides every conflict.

The exports are in `/proposed`, which may change at any time.

## The store

`createSyncedStore` keeps the document on the device and syncs it with the remote. The consumer supplies:

- `storage`: a `KeyValueStore`, such as AsyncStorage, which keeps the device's copy of the document and its unsent changes.
- `remote`: a `SyncedRepository` that the consumer implements over its own service.
- `key`: the prefix of the store's keys in `storage`, unique per store.
- A schema type, which maps each part and each collection to the type of its values. The store checks that each value it writes is JSON; checking the values that it reads is the consumer's.

A write is stored on the device and resolves without waiting for the remote. The store then tries to sync, and a sync sends the unsent changes and merges the remote's document into the device's. Each request fails after `requestTimeoutMs` (10 seconds by default), and a pending request does not delay a write. `read()` returns the document with its `unsentCount` and the `syncError` of the last sync, and `subscribe` calls a listener with each new state.

The store does not watch connectivity or retry on a timer. Call `sync()` when the app reconnects and when it returns to the foreground.

Creating the store touches neither storage nor the remote, so it can be created during a static web render; the first `read`, `write`, or `sync` loads the device's data. A device id is created on first use with `crypto.randomUUID`; on React Native without a polyfill, pass `createDeviceId`.

## Documents and versions

A document has named parts, each saved whole, and named collections of items keyed by id. Each part and each item is a unit, and the document is stored as one version per unit. Every version has a change stamp, which `HybridClock` issues; a deletion of an item is stored as a tombstone. A value is JSON that survives a round trip unchanged: The bundled repositories reject `NaN`, `Infinity`, an `undefined` member, and an object other than a plain one.

## The merge rule

`mergeVersion` decides between two versions of one unit:

- A tombstone beats any value, whatever their stamps: An amendment never restores a deleted item.
- Otherwise the version with the greater stamp wins, whichever arrives last.

The rule gives the same result for any order of the same versions, applied any number of times, so a replica and a remote that receive the same versions keep the same document. That holds while each stamp identifies one version: A device persists its clock's `last` and passes it to the next `HybridClock`, so that a wall clock set back across a restart cannot make it issue a stamp twice.

## Ports

- `SyncedRepository` stores one document. The device's replica and the remote both implement it. `createMemoryRepository` keeps a document in memory, and `createKeyValueRepository` keeps it under one key of a `KeyValueStore`.
- `KeyValueStore` stores strings by key. AsyncStorage satisfies it as it is, and `createMemoryKeyValueStore` keeps its values in memory.

## The contract that a remote implements

- `load` returns the current version of every unit, tombstones included, in any order.
- `apply` merges a batch of versions under the merge rule, all or none.
- A stamp compares by its UTF-16 code units, as `compareStamps` does. In SQL, compare stamps with a binary collation, such as `COLLATE "C"` in PostgreSQL; another collation orders some stamps differently. A stamp is ASCII, since its device id is printable ASCII without spaces, so the two orders agree.
- A call whose signal is already aborted rejects and changes nothing.

`listRepositoryContractCases` and `listKeyValueStoreContractCases` return the checks that every implementation passes. They do not depend on a test runner; each check throws when the implementation fails it:

```ts
for (const contractCase of listRepositoryContractCases()) {
  it(contractCase.name, () => contractCase.run(createRemoteRepository));
}
```
