import { describe, expect, it } from 'vitest';

import { listMathIdioms } from '../listMathIdioms.ts';

describe(listMathIdioms, () => {
  it('names each idiom it finds and orders the sites by line', () => {
    const source = [
      'const roll = Math.floor(Math.random() * sides);',
      'const rate = Math.round(value * 100) / 100;',
      'const bounded = Math.max(min, Math.min(max, value));',
      '',
    ].join('\n');

    expect(listMathIdioms(source)).toStrictEqual([
      { kind: 'random-integer', line: 1 },
      { kind: 'round-scale', line: 2 },
      { kind: 'clamp-nest', line: 3 },
    ]);
  });

  it('finds nothing in a source holding none of the idioms', () => {
    expect(listMathIdioms('export const total = items.length * 2;\n')).toStrictEqual([]);
  });

  it('finds nothing in prose about the idioms', () => {
    const sources = [
      '// Replaces Math.floor(Math.random() * sides) with pickInteger.\n',
      '/**\n * Bounds a value with Math.max(min, Math.min(max, value)).\n */\n',
      "const fix = 'use round instead of Math.round(value * 100) / 100';\n",
      'const fix = `use clamp instead of Math.max(min, Math.min(max, value))`;\n',
      'const pattern = /Math.floor(Math.random() * n)/;\n',
    ];

    expect(sources.map(listMathIdioms)).toStrictEqual(sources.map(() => []));
  });

  // An interpolated expression is code that runs, so the idiom in it is one a consumer can retire.
  it('claims an idiom interpolated into a template literal', () => {
    const source = 'const label = `bounded to ${Math.max(min, Math.min(max, value))}`;\n';

    expect(listMathIdioms(source)).toStrictEqual([{ kind: 'clamp-nest', line: 1 }]);
  });

  // Blanking leaves a literal's delimiters standing, which is what lets `isArraySubscript` read the closing
  // quote as the expression a subscript indexes. Blank the quotes too and this kit claims a site that it hands off.
  it('declines a floored random subscripting a string literal, which another kit claims', () => {
    const source = "const character = 'abcdef'[Math.floor(Math.random() * 6)];\n";

    expect(listMathIdioms(source)).toStrictEqual([]);
  });
});
