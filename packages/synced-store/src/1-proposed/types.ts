/** A value that survives a JSON round trip unchanged. */
export type JsonValue = null | boolean | number | string | readonly JsonValue[] | { readonly [key: string]: JsonValue };

/** One version of a named part of the document, which is saved whole. */
export interface PartVersion {
  kind: 'part';
  name: string;
  stamp: string;
  value: JsonValue;
}

/** One version of an item of a named collection. */
export interface ItemVersion {
  kind: 'item';
  collection: string;
  id: string;
  stamp: string;
  value: JsonValue;
}

/** The deletion of an item, which no later version of the item undoes. */
export interface ItemTombstone {
  kind: 'item';
  collection: string;
  id: string;
  stamp: string;
  deleted: true;
}

/** A version of one unit of a document: a part, or an item of a collection. */
export type Version = PartVersion | ItemVersion | ItemTombstone;
