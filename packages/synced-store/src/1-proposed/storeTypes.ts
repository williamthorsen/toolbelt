import type { KeyValueStore, SyncedRepository } from './ports.ts';

/**
 * Maps each part and each collection of a document to the type of its values. The store checks at runtime that every
 * value it writes survives a JSON round trip; it does not check that a value it reads has the mapped type.
 */
export interface StoreSchema {
  parts: Record<string, unknown>;
  collections: Record<string, unknown>;
}

/** A change that `write` applies: a part's new value, an item's new value, or an item's deletion. */
export type StoreChange<TSchema extends StoreSchema> = PartChange<TSchema> | ItemChange<TSchema>;

/** The new value of a part. */
export type PartChange<TSchema extends StoreSchema> = {
  [TName in keyof TSchema['parts'] & string]: { kind: 'part'; name: TName; value: TSchema['parts'][TName] };
}[keyof TSchema['parts'] & string];

/** The new value of an item, or its deletion, which no later change to the item undoes. */
export type ItemChange<TSchema extends StoreSchema> = {
  [TCollection in keyof TSchema['collections'] & string]:
    | { kind: 'item'; collection: TCollection; id: string; value: TSchema['collections'][TCollection] }
    | { kind: 'item'; collection: TCollection; id: string; deleted: true };
}[keyof TSchema['collections'] & string];

/** The document as the device holds it, with the state of its sync. The store replaces it rather than changing it. */
export interface StoreState<TSchema extends StoreSchema> {
  /** The value of each part that has one. */
  readonly parts: { readonly [TName in keyof TSchema['parts']]?: TSchema['parts'][TName] };
  /** The items of each collection that holds one, by id. Deleted items are absent. */
  readonly collections: {
    readonly [TCollection in keyof TSchema['collections']]?: ReadonlyMap<string, TSchema['collections'][TCollection]>;
  };
  /** The number of parts and items whose latest change the remote has not acknowledged. */
  readonly unsentCount: number;
  /** The rejection value of the last sync, or `undefined` when the last sync succeeded or none has run. */
  readonly syncError: unknown;
}

/** A document kept on the device and synced with a remote. */
export interface SyncedStore<TSchema extends StoreSchema> {
  /** Resolves to the current state, which stays the same object until the next change. */
  read(): Promise<StoreState<TSchema>>;
  /**
   * Applies the changes to the device together, and resolves once they are stored there, without waiting for the
   * remote. Rejects with a `TypeError`, and changes nothing, when a value would not survive a JSON round trip. A write
   * that storage rejects may still have been kept, and then appears in the state on the store's next use.
   */
  write(changes: readonly StoreChange<TSchema>[]): Promise<void>;
  /**
   * Sends the unsent changes to the remote, then merges the remote's document into the device's. Rejects with the
   * first failure, such as a `TimeoutError` `DOMException` for a request that does not answer in time.
   */
  sync(): Promise<void>;
  /** Calls the listener with each new state, and returns a function that unsubscribes it. */
  subscribe(listener: (state: StoreState<TSchema>) => void): () => void;
}

/** Options for `createSyncedStore`. */
export interface SyncedStoreOptions {
  /** The prefix of the two keys under which the store keeps its data in `storage`; unique per store. */
  key: string;
  /** Stores the device's replica, its id, its clock, and its unsent changes. */
  storage: KeyValueStore;
  /** The remote with which the store syncs. */
  remote: SyncedRepository;
  /** The milliseconds after which a request to the remote fails. Defaults to 10 000. */
  requestTimeoutMs?: number | undefined;
  /**
   * Returns a new device id: printable ASCII characters other than the space, unique to the device. Defaults to
   * `crypto.randomUUID`, which a React Native app without a polyfill lacks.
   */
  createDeviceId?: (() => string) | undefined;
  /** Returns the wall-clock time in milliseconds since the epoch. Defaults to `Date.now`. */
  now?: (() => number) | undefined;
}
