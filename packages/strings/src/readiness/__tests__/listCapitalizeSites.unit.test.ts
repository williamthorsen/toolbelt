import { listSourceSites } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listCapitalizeSites } from '../listCapitalizeSites.ts';

describe(listCapitalizeSites, () => {
  it('claims the canonical form', () => {
    expect(listLines('const label = word.charAt(0).toUpperCase() + word.slice(1);\n')).toStrictEqual([1]);
  });

  it('claims the subscript form', () => {
    expect(listLines('const label = word[0].toUpperCase() + word.slice(1);\n')).toStrictEqual([1]);
  });

  it('claims a substring tail', () => {
    expect(listLines('const label = word.charAt(0).toUpperCase() + word.substring(1);\n')).toStrictEqual([1]);
  });

  it('claims the halves joined by adjacent template substitutions', () => {
    expect(listLines('const label = `${word[0].toUpperCase()}${word.slice(1)}`;\n')).toStrictEqual([1]);
  });

  it('claims a subject accessed through a member expression', () => {
    const source = 'const label = this.name.charAt(0).toUpperCase() + this.name.slice(1);\n';

    expect(listLines(source)).toStrictEqual([1]);
  });

  it('claims a capitalization broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const label =\n  word.charAt(0).toUpperCase() +\n  word.slice(1);\n';

    expect(listLines(source)).toStrictEqual([2]);
  });

  it('claims each of several capitalizations in one source', () => {
    const source = 'const a = x.charAt(0).toUpperCase() + x.slice(1);\nconst b = y[0].toUpperCase() + y.slice(1);\n';

    expect(listLines(source)).toStrictEqual([1, 2]);
  });

  // The trailing call applies to the whole expression, which `capitalize` returns.
  it('claims a capitalization that the source transforms as a whole', () => {
    const source = 'const label = (word.charAt(0).toUpperCase() + word.slice(1)).trim();\n';

    expect(listLines(source)).toStrictEqual([1]);
  });

  it('declines halves that name different subjects', () => {
    expect(listLines('const label = first.charAt(0).toUpperCase() + second.slice(1);\n')).toStrictEqual([]);
  });

  // The subject would otherwise be read as `X`, whose tail the second half does supply.
  it('declines a subject that would have to start mid-identifier', () => {
    expect(listLines('const label = sX.charAt(0).toUpperCase() + X.slice(1);\n')).toStrictEqual([]);
  });

  // `deriveCaseTransformer` builds exactly this: Capitalizing while lower-casing the tail is a different
  // transformation, and this package publishes nothing that performs it.
  it('declines a tail re-cased by the source', () => {
    const source = 'const t = (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();\n';

    expect(listLines(source)).toStrictEqual([]);
  });

  // The chained call applies to the tail alone, so `capitalize` is not the substitution that the fix text promises.
  it('declines a tail that the source goes on to transform', () => {
    const source = "const label = word.charAt(0).toUpperCase() + word.slice(1).replace(/_/g, ' ');\n";

    expect(listLines(source)).toStrictEqual([]);
  });

  it('declines a tail that drops a different number of characters', () => {
    expect(listLines('const label = word.charAt(0).toUpperCase() + word.slice(2);\n')).toStrictEqual([]);
  });

  it('declines a tail bounded at both ends', () => {
    expect(listLines('const label = word.charAt(0).toUpperCase() + word.slice(1, 4);\n')).toStrictEqual([]);
  });

  it('declines an upper-cased first character that is never joined to a tail', () => {
    expect(listLines('const initial = word.charAt(0).toUpperCase();\n')).toStrictEqual([]);
  });

  it('declines a lower-cased first character', () => {
    expect(listLines('const label = word.charAt(0).toLowerCase() + word.slice(1);\n')).toStrictEqual([]);
  });
});

// region | Helpers

/** Lists the lines of the sites that the detector finds in a source, blanked as the kit blanks it. */
function listLines(source: string): number[] {
  return listSourceSites([listCapitalizeSites], source).map(({ line }) => line);
}

// endregion | Helpers
