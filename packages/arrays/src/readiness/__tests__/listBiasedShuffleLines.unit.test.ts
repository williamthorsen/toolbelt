import { describe, expect, it } from 'vitest';

import { listBiasedShuffleLines } from '../listBiasedShuffleLines.ts';

describe(listBiasedShuffleLines, () => {
  it('claims a comparator subtracting a half from the draw, and its mirror', () => {
    const sources = [
      'const mixed = items.sort(() => Math.random() - 0.5);\n',
      'const mixed = items.sort(() => 0.5 - Math.random());\n',
    ];

    expect(sources.map((source) => listBiasedShuffleLines(source))).toStrictEqual([[1], [1]]);
  });

  it('claims a comparator ranking by a ternary on the draw', () => {
    const sources = [
      'const mixed = items.sort(() => (Math.random() < 0.5 ? -1 : 1));\n',
      'const mixed = items.sort(() => (Math.random() > 0.5 ? 1 : -1));\n',
    ];

    expect(sources.map((source) => listBiasedShuffleLines(source))).toStrictEqual([[1], [1]]);
  });

  it('claims a comparator declaring parameters its body never reads', () => {
    expect(listBiasedShuffleLines('const mixed = items.sort((a, b) => Math.random() - 0.5);\n')).toStrictEqual([1]);
  });

  it('claims a block body and an inline function alike', () => {
    const sources = [
      'const mixed = items.sort(() => {\n  return Math.random() - 0.5;\n});\n',
      'const mixed = items.sort(function () {\n  return Math.random() - 0.5;\n});\n',
    ];

    expect(sources.map((source) => listBiasedShuffleLines(source))).toStrictEqual([[1], [1]]);
  });

  it('claims the copying method as well as the mutating one', () => {
    expect(listBiasedShuffleLines('const mixed = items.toSorted(() => Math.random() - 0.5);\n')).toStrictEqual([1]);
  });

  it('claims a comparator a formatter broke across lines, at the line the call opens on', () => {
    const source = 'const mixed = items.sort(\n  () => Math.random() - 0.5,\n);\n';

    expect(listBiasedShuffleLines(source)).toStrictEqual([1]);
  });

  // The draw breaks ties among equal keys, which is a deliberate choice `shuffle` does not reproduce.
  it('declines a comparator that ranks by its operands and draws only to break a tie', () => {
    const source = 'const ranked = rows.sort((a, b) => a.score - b.score || Math.random() - 0.5);\n';

    expect(listBiasedShuffleLines(source)).toStrictEqual([]);
  });

  // A combinator's own arrow is not the argument's, so a draw inside it breaks ties within a primary ordering.
  it('declines a comparator a combinator assembles around an arrow of its own', () => {
    const sources = [
      'const ranked = rows.sort(thenBy(byScore, () => Math.random() - 0.5));\n',
      'const ranked = rows.sort(withJitter(byName, () => Math.random() * 0.01));\n',
    ];

    expect(sources.filter((source) => listBiasedShuffleLines(source).length > 0)).toStrictEqual([]);
  });

  it('claims an arrow declaring a single parameter without parentheses', () => {
    expect(listBiasedShuffleLines('const mixed = items.sort(a => Math.random() - 0.5);\n')).toStrictEqual([1]);
  });

  it('claims an arrow carrying a return-type annotation', () => {
    const source = 'const mixed = items.sort((a: Row, b: Row): number => Math.random() - 0.5);\n';

    expect(listBiasedShuffleLines(source)).toStrictEqual([1]);
  });

  it('declines an ordinary comparator and a sort taking none', () => {
    const sources = [
      'const ranked = values.sort((a, b) => a - b);\n',
      'const ranked = values.sort();\n',
      'const ranked = values.sort(byScore);\n',
    ];

    expect(sources.filter((source) => listBiasedShuffleLines(source).length > 0)).toStrictEqual([]);
  });

  it('declines a draw the source makes outside a comparator', () => {
    expect(listBiasedShuffleLines('const jitter = Math.random() - 0.5;\n')).toStrictEqual([]);
  });

  it('declines a method whose name merely ends in sort', () => {
    expect(listBiasedShuffleLines('const mixed = index.resort(() => Math.random() - 0.5);\n')).toStrictEqual([]);
  });
});
