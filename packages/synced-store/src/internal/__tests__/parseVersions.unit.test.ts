import { describe, expect, it } from 'vitest';

import { parseVersions } from '../parseVersions.ts';

describe(parseVersions, () => {
  it('parses a JSON array of versions', () => {
    const versions = [{ kind: 'part', name: 'names', stamp: '2026-11-24T14:40:07.123Z_0000_a', value: 'Ann' }];

    expect(parseVersions(JSON.stringify(versions), 'The replica')).toStrictEqual(versions);
  });

  it.each([
    ['text that is not JSON', '{'],
    ['JSON that is not an array', '{}'],
    ['an array with a value that is not a version', '[1]'],
  ])('throws an error naming the source on %s', (_label, json) => {
    expect(() => parseVersions(json, 'The replica')).toThrow(/^The replica /u);
  });
});
