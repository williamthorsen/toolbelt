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
});
