import { describe, expect, it } from 'vitest';

import { listArrayIdioms } from '../listArrayIdioms.ts';

describe(listArrayIdioms, () => {
  it('reports each idiom under its own kind, in line order', () => {
    const source = [
      'const list = Array.isArray(value) ? value : [value];',
      'const item = items[Math.floor(Math.random() * items.length)];',
      'const mixed = items.sort(() => Math.random() - 0.5);',
      '',
    ].join('\n');

    expect(listArrayIdioms(source)).toStrictEqual([
      { kind: 'arraify-inline', line: 1 },
      { kind: 'random-item', line: 2 },
      { kind: 'biased-shuffle', line: 3 },
    ]);
  });

  it('reports nothing for an idiom written in a comment or a literal', () => {
    const source = [
      '// const mixed = items.sort(() => Math.random() - 0.5);',
      "const advice = 'Array.isArray(value) ? value : [value]';",
      '',
    ].join('\n');

    expect(listArrayIdioms(source)).toStrictEqual([]);
  });
});
