import { describe, expect, it } from 'vitest';

import { formatUnitKey, mergeVersion, mergeVersions } from '../mergeVersion.ts';
import type { ItemTombstone, ItemVersion, PartVersion, Version } from '../types.ts';

const OLDER = '2026-11-24T14:40:07.123Z_0000_a';
const NEWER = '2026-11-24T14:40:08.000Z_0000_b';

describe(mergeVersion, () => {
  it('keeps the incoming version when nothing is stored', () => {
    const incoming = buildItem(OLDER, 'x');

    expect(mergeVersion(undefined, incoming)).toBe(incoming);
  });

  it('keeps the later edit of an item, whichever arrives last', () => {
    const older = buildItem(OLDER, 'older');
    const newer = buildItem(NEWER, 'newer');

    expect(mergeVersion(older, newer)).toBe(newer);
    expect(mergeVersion(newer, older)).toBe(newer);
  });

  it('keeps a tombstone over an amendment stamped after it, whichever arrives last', () => {
    const tombstone = buildTombstone(OLDER);
    const amendment = buildItem(NEWER, 'amended');

    expect(mergeVersion(tombstone, amendment)).toBe(tombstone);
    expect(mergeVersion(amendment, tombstone)).toBe(tombstone);
  });

  it('keeps the later of two tombstones', () => {
    const older = buildTombstone(OLDER);
    const newer = buildTombstone(NEWER);

    expect(mergeVersion(older, newer)).toBe(newer);
    expect(mergeVersion(newer, older)).toBe(newer);
  });

  it('keeps the current version when the stamps are equal', () => {
    const current = buildItem(OLDER, 'current');

    expect(mergeVersion(current, buildItem(OLDER, 'incoming'))).toBe(current);
  });

  it('throws on versions of different units', () => {
    expect(() => mergeVersion(buildPart('names', OLDER, 'a'), buildPart('rulebook', NEWER, 'b'))).toThrow(TypeError);
  });
});

describe(mergeVersions, () => {
  it('keeps both changes when two devices save different parts of one record', () => {
    const names = buildPart('names', OLDER, { player: 'Ann' });
    const rulebook = buildPart('rulebook', NEWER, { tithe: 10 });

    expect(sortByUnit(mergeVersions([names], [rulebook]))).toStrictEqual([names, rulebook]);
  });

  it('merges every order of a set of versions, with repeats, to the same snapshot', () => {
    const versions: Version[] = [
      buildPart('names', OLDER, 'old names'),
      buildPart('names', NEWER, 'new names'),
      buildItem(OLDER, 'old entry'),
      buildTombstone(NEWER),
      buildItem(NEWER, 'new entry', 'entry-2'),
    ];
    const expected = sortByUnit(mergeVersions([], versions));

    for (const order of listPermutations(versions)) {
      const halfway = Math.floor(order.length / 2);
      const merged = mergeVersions(mergeVersions(order.slice(0, halfway), order), order.slice(halfway));

      expect(sortByUnit(merged)).toStrictEqual(expected);
    }
  });
});

describe(formatUnitKey, () => {
  it('distinguishes a part from an item whose collection has the part name', () => {
    expect(formatUnitKey(buildPart('entries', OLDER, null))).not.toBe(formatUnitKey(buildItem(OLDER, null)));
  });
});

// region | Helpers
function buildItem(stamp: string, value: ItemVersion['value'], id = 'entry-1'): ItemVersion {
  return { kind: 'item', collection: 'entries', id, stamp, value };
}

function buildPart(name: string, stamp: string, value: PartVersion['value']): PartVersion {
  return { kind: 'part', name, stamp, value };
}

function buildTombstone(stamp: string): ItemTombstone {
  return { kind: 'item', collection: 'entries', id: 'entry-1', stamp, deleted: true };
}

function listPermutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]];
  return items.flatMap((item, index) => listPermutations(items.toSpliced(index, 1)).map((rest) => [item, ...rest]));
}

function sortByUnit(versions: readonly Version[]): Version[] {
  return versions.toSorted((a, b) => formatUnitKey(a).localeCompare(formatUnitKey(b)));
}
// endregion | Helpers
