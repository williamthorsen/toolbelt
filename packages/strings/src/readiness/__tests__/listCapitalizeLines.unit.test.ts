import { describe, expect, it } from 'vitest';

import { listCapitalizeLines } from '../listCapitalizeLines.ts';

describe(listCapitalizeLines, () => {
  it('claims the canonical form', () => {
    expect(listCapitalizeLines('const label = word.charAt(0).toUpperCase() + word.slice(1);\n')).toStrictEqual([1]);
  });

  it('claims the subscript form', () => {
    expect(listCapitalizeLines('const label = word[0].toUpperCase() + word.slice(1);\n')).toStrictEqual([1]);
  });

  it('claims a substring tail', () => {
    expect(listCapitalizeLines('const label = word.charAt(0).toUpperCase() + word.substring(1);\n')).toStrictEqual([1]);
  });

  it('claims the halves joined by adjacent template substitutions', () => {
    expect(listCapitalizeLines('const label = `${word[0].toUpperCase()}${word.slice(1)}`;\n')).toStrictEqual([1]);
  });

  it('claims a subject reached through a member expression', () => {
    const source = 'const label = this.name.charAt(0).toUpperCase() + this.name.slice(1);\n';

    expect(listCapitalizeLines(source)).toStrictEqual([1]);
  });

  it('claims a capitalization broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const label =\n  word.charAt(0).toUpperCase() +\n  word.slice(1);\n';

    expect(listCapitalizeLines(source)).toStrictEqual([2]);
  });

  it('claims each of several capitalizations in one source', () => {
    const source = 'const a = x.charAt(0).toUpperCase() + x.slice(1);\nconst b = y[0].toUpperCase() + y.slice(1);\n';

    expect(listCapitalizeLines(source)).toStrictEqual([1, 2]);
  });

  // The trailing call reaches the whole expression, which is what `capitalize` returns.
  it('claims a capitalization that the source transforms as a whole', () => {
    const source = 'const label = (word.charAt(0).toUpperCase() + word.slice(1)).trim();\n';

    expect(listCapitalizeLines(source)).toStrictEqual([1]);
  });

  it('declines halves that name different subjects', () => {
    expect(listCapitalizeLines('const label = first.charAt(0).toUpperCase() + second.slice(1);\n')).toStrictEqual([]);
  });

  // The subject would otherwise be read as `X`, whose tail the second half does supply.
  it('declines a subject that would have to start mid-identifier', () => {
    expect(listCapitalizeLines('const label = sX.charAt(0).toUpperCase() + X.slice(1);\n')).toStrictEqual([]);
  });

  // `deriveCaseTransformer` builds exactly this: capitalizing while lower-casing the tail is a different
  // transformation, and this package publishes nothing that performs it.
  it('declines a tail re-cased by the source', () => {
    const source = 'const t = (text) => text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();\n';

    expect(listCapitalizeLines(source)).toStrictEqual([]);
  });

  // The chained call reaches the tail alone, so `capitalize` is not the substitution that the fix text promises.
  it('declines a tail that the source goes on to transform', () => {
    const source = "const label = word.charAt(0).toUpperCase() + word.slice(1).replace(/_/g, ' ');\n";

    expect(listCapitalizeLines(source)).toStrictEqual([]);
  });

  it('declines a tail that drops a different number of characters', () => {
    expect(listCapitalizeLines('const label = word.charAt(0).toUpperCase() + word.slice(2);\n')).toStrictEqual([]);
  });

  it('declines a tail bounded at both ends', () => {
    expect(listCapitalizeLines('const label = word.charAt(0).toUpperCase() + word.slice(1, 4);\n')).toStrictEqual([]);
  });

  it('declines an upper-cased first character that is never joined to a tail', () => {
    expect(listCapitalizeLines('const initial = word.charAt(0).toUpperCase();\n')).toStrictEqual([]);
  });

  it('declines a lower-cased first character', () => {
    expect(listCapitalizeLines('const label = word.charAt(0).toLowerCase() + word.slice(1);\n')).toStrictEqual([]);
  });
});
