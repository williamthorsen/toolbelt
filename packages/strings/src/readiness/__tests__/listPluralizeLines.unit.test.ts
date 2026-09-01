import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listPluralizeLines } from '../listPluralizeLines.ts';

describe(listPluralizeLines, () => {
  it('claims a literal pair whose plural is the singular plus s', () => {
    expect(listLines("const noun = count === 1 ? 'item' : 'items';\n")).toStrictEqual([1]);
  });

  it('claims a bare suffix under an equality test', () => {
    expect(listLines("const label = `${count} file${count === 1 ? '' : 's'}`;\n")).toStrictEqual([1]);
  });

  it('claims a bare suffix under an inequality test, whose branches are reversed', () => {
    expect(listLines("const label = `${count} file${count !== 1 ? 's' : ''}`;\n")).toStrictEqual([1]);
  });

  it('claims a pair written with double quotes', () => {
    expect(listLines('const noun = count === 1 ? "item" : "items";\n')).toStrictEqual([1]);
  });

  it('claims a comparison against a length', () => {
    expect(listLines("const noun = items.length === 1 ? 'file' : 'files';\n")).toStrictEqual([1]);
  });

  it('claims a parenthesized condition', () => {
    expect(listLines("const noun = (count === 1) ? 'item' : 'items';\n")).toStrictEqual([1]);
  });

  it('claims a ternary broken across lines by a formatter, at the line it opens on', () => {
    expect(listLines("const noun =\n  count === 1\n    ? 'item'\n    : 'items';\n")).toStrictEqual([2]);
  });

  // The literals are read from the unblanked source at offsets the blanked code reports, so anything that
  // shifts one text against the other reads the wrong span.
  it('reads the literals through a comment sitting inside the ternary', () => {
    expect(listLines("const noun = count === 1 ? /* one */ 'item' : 'items';\n")).toStrictEqual([1]);
  });

  // `TimeUnit` holds this shape. Nothing here can tell a string identifier from any other, so the pair that
  // proves the comparison counts something is the only pair claimed.
  it('declines a pair of identifiers', () => {
    expect(listLines('const noun = amount === 1 ? this.singular : this.plural;\n')).toStrictEqual([]);
  });

  it('declines a literal pair holding no singular-to-plural relation', () => {
    expect(listLines("const label = status === 1 ? 'active' : 'inactive';\n")).toStrictEqual([]);
  });

  it('declines a pair whose branches are the wrong way round', () => {
    expect(listLines("const noun = count === 1 ? 'items' : 'item';\n")).toStrictEqual([]);
  });

  // Its fix is a behavioral correction, not a substitution: it prints "0 item".
  it('declines a suffix chosen by a greater-than test', () => {
    expect(listLines("const label = `${count} file${count > 1 ? 's' : ''}`;\n")).toStrictEqual([]);
  });

  it('declines a comparison against any other number', () => {
    expect(listLines("const noun = count === 2 ? 'item' : 'items';\n")).toStrictEqual([]);
  });

  it('declines a pluralization written in a comment', () => {
    expect(listLines("// const noun = count === 1 ? 'item' : 'items';\n")).toStrictEqual([]);
  });
});

// region | Helpers

/** Runs the detector over a source and the blanked code its caller would hand it. */
function listLines(source: string): number[] {
  return listPluralizeLines(blankNonCode(source), source);
}

// endregion | Helpers
