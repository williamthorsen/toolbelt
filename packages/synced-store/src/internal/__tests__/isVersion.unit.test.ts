import { describe, expect, it } from 'vitest';

import { isVersion } from '../isVersion.ts';

const STAMP = '2026-11-24T14:40:07.123Z_0000_a';

describe(isVersion, () => {
  it.each([
    ['a part', { kind: 'part', name: 'names', stamp: STAMP, value: null }],
    ['an item', { kind: 'item', collection: 'entries', id: 'e1', stamp: STAMP, value: { amount: 3 } }],
    ['a tombstone', { kind: 'item', collection: 'entries', id: 'e1', stamp: STAMP, deleted: true }],
  ])('accepts %s', (_label, value) => {
    expect(isVersion(value)).toBe(true);
  });

  it.each([
    ['a part without a value', { kind: 'part', name: 'names', stamp: STAMP }],
    ['a deleted part', { kind: 'part', name: 'names', stamp: STAMP, value: 1, deleted: true }],
    [
      'an item with a value and a deletion',
      { kind: 'item', collection: 'c', id: 'e1', stamp: STAMP, value: 1, deleted: true },
    ],
    ['an item without an id', { kind: 'item', collection: 'c', stamp: STAMP, value: 1 }],
    ['a tombstone whose deletion is not true', { kind: 'item', collection: 'c', id: 'e1', stamp: STAMP, deleted: 1 }],
    ['an unknown kind', { kind: 'record', name: 'names', stamp: STAMP, value: 1 }],
    ['a malformed stamp', { kind: 'part', name: 'names', stamp: 'now', value: 1 }],
    ['an array', []],
  ])('rejects %s', (_label, value) => {
    expect(isVersion(value)).toBe(false);
  });
});
