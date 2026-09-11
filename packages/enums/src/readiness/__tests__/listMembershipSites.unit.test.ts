import { describe, expect, it } from 'vitest';

import { listMembershipSites } from '../listMembershipSites.ts';

// Every spelling of one membership test, including those that TypeScript forces where the candidate's type is
// wider than the enum.
const CLAIMED = [
  'const known = Object.values(Color).includes(value);',
  'const known = Object.values(Color).includes(value as Color);',
  'const known = Object.values<string>(Color).includes(value);',
  'const known = (Object.values(Color) as string[]).includes(value);',
  'const known = (Object.values(Color) as (string | number)[]).includes(value);',
  'const known = Object.values(Palette.Color).includes(value);',
  'if (!Object.values(Color).includes(value)) throw new Error(message);',
  'return (Object.values(Color) as readonly string[]).includes(value);',
  'const member = Object.values(Color).includes(value) ? value : undefined;',
];

// Code that reads an object's values or tests its keys, and spellings that the kit leaves unclaimed. Each is
// declined for a reason of its own.
const DECLINED = [
  'const position = Object.values(Color).indexOf(value);',
  'const known = Object.values(Color).some((member) => member === value);',
  'const known = new Set(Object.values(Color)).has(value);',
  'const values = Object.values(Color); const known = values.includes(value);',
  'const known = Object.keys(Color).includes(key);',
  'const known = key in Color;',
  'const count = Object.values(Color).length;',
  'const known = Object.values(loadPalette()).includes(value);',
  "const known = Object.values({ red: 'r' }).includes(value);",
  'const known = Realm.Object.values(Color).includes(value);',
  'const known = wrap(Object.values(Color) as string[]).includes(value);',
  'const known = includes(Object.values(Color), value);',
];

describe(listMembershipSites, () => {
  it('claims every spelling of a search of the values', () => {
    const unclaimed = CLAIMED.filter((source) => listMembershipSites(source).length !== 1);

    expect(unclaimed).toStrictEqual([]);
  });

  it('reports the kind that the kit checks against', () => {
    expect(listMembershipSites(CLAIMED[0] ?? '')).toStrictEqual([{ kind: 'values-includes', line: 1 }]);
  });

  it('declines code that reads the values without searching them, or searches something else', () => {
    const claimed = DECLINED.filter((source) => listMembershipSites(source).length > 0);

    expect(claimed).toStrictEqual([]);
  });

  it('names the line that holds the values call', () => {
    const source = ['const before = 1;', '', 'const known = Object.values(Color).includes(value);'].join('\n');

    expect(listMembershipSites(source)).toStrictEqual([{ kind: 'values-includes', line: 3 }]);
  });

  it('spans a test that a formatter broke across lines, at the line of the values call', () => {
    const direct = ['const known = Object.values(Color)', '  .includes(value);'].join('\n');
    const asserted = ['const known = (', '  Object.values(Color) as string[]', ').includes(value);'].join('\n');

    expect([...listMembershipSites(direct), ...listMembershipSites(asserted)]).toStrictEqual([
      { kind: 'values-includes', line: 1 },
      { kind: 'values-includes', line: 2 },
    ]);
  });

  it('declines a call argument that a formatter moved onto its own line', () => {
    const source = ['const known = wrap(', '  Object.values(Color) as string[],', ').includes(value);'].join('\n');

    expect(listMembershipSites(source)).toStrictEqual([]);
  });

  it('reports each of several tests in one source', () => {
    const source = [
      'const first = Object.values(Color).includes(value);',
      'const second = Object.values(Shade).includes(value);',
    ].join('\n');

    expect(listMembershipSites(source).map((site) => site.line)).toStrictEqual([1, 2]);
  });

  it('does not claim the idiom written in a comment', () => {
    expect(listMembershipSites('// const known = Object.values(Color).includes(value);')).toStrictEqual([]);
  });

  it('does not claim the idiom written in a string', () => {
    expect(listMembershipSites("const sample = 'Object.values(Color).includes(value)';")).toStrictEqual([]);
  });
});
