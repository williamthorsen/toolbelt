import { listSiteLines } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listPluralizeSites } from '../listPluralizeSites.ts';

describe(listPluralizeSites, () => {
  it('claims a literal pair whose plural is the singular plus s', () => {
    expect(listSiteLines(listPluralizeSites, "const noun = count === 1 ? 'item' : 'items';\n")).toStrictEqual([1]);
  });

  it('claims a bare suffix under an equality test', () => {
    expect(
      listSiteLines(listPluralizeSites, "const label = `${count} file${count === 1 ? '' : 's'}`;\n"),
    ).toStrictEqual([1]);
  });

  it('claims a bare suffix under an inequality test, whose branches are reversed', () => {
    expect(
      listSiteLines(listPluralizeSites, "const label = `${count} file${count !== 1 ? 's' : ''}`;\n"),
    ).toStrictEqual([1]);
  });

  it('claims a pair written with double quotes', () => {
    expect(listSiteLines(listPluralizeSites, 'const noun = count === 1 ? "item" : "items";\n')).toStrictEqual([1]);
  });

  it('claims a comparison against a length', () => {
    expect(listSiteLines(listPluralizeSites, "const noun = items.length === 1 ? 'file' : 'files';\n")).toStrictEqual([
      1,
    ]);
  });

  it('claims a parenthesized condition', () => {
    expect(listSiteLines(listPluralizeSites, "const noun = (count === 1) ? 'item' : 'items';\n")).toStrictEqual([1]);
  });

  it('claims a ternary broken across lines by a formatter, at the line on which it opens', () => {
    expect(
      listSiteLines(listPluralizeSites, "const noun =\n  count === 1\n    ? 'item'\n    : 'items';\n"),
    ).toStrictEqual([2]);
  });

  // The literals are read from the unblanked source at offsets found in the blanked code, so if anything shifts
  // one text against the other, the detector reads the wrong span.
  it('reads the literals through a comment inside the ternary', () => {
    expect(listSiteLines(listPluralizeSites, "const noun = count === 1 ? /* one */ 'item' : 'items';\n")).toStrictEqual(
      [1],
    );
  });

  // The detector cannot tell a string identifier from any other, so the pair that proves the comparison counts
  // something is the only pair claimed.
  it('declines a pair of identifiers', () => {
    expect(
      listSiteLines(listPluralizeSites, 'const noun = amount === 1 ? this.singular : this.plural;\n'),
    ).toStrictEqual([]);
  });

  it('declines a literal pair with no singular-to-plural relation', () => {
    expect(listSiteLines(listPluralizeSites, "const label = status === 1 ? 'active' : 'inactive';\n")).toStrictEqual(
      [],
    );
  });

  it('declines a pair whose branches are the wrong way round', () => {
    expect(listSiteLines(listPluralizeSites, "const noun = count === 1 ? 'items' : 'item';\n")).toStrictEqual([]);
  });

  // Its fix is a behavioral correction, not a substitution: It prints "0 item".
  it('declines a suffix chosen by a greater-than test', () => {
    expect(listSiteLines(listPluralizeSites, "const label = `${count} file${count > 1 ? 's' : ''}`;\n")).toStrictEqual(
      [],
    );
  });

  it('declines a comparison against any other number', () => {
    expect(listSiteLines(listPluralizeSites, "const noun = count === 2 ? 'item' : 'items';\n")).toStrictEqual([]);
  });

  it('declines a pluralization written in a comment', () => {
    expect(listSiteLines(listPluralizeSites, "// const noun = count === 1 ? 'item' : 'items';\n")).toStrictEqual([]);
  });
});
