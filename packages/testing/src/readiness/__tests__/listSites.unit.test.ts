import { describe, expect, it } from 'vitest';

import { listSites } from '../listSites.ts';

describe(listSites, () => {
  it('reports nothing for a file holding none of the idioms', () => {
    expect(listSites("it('works', () => {});")).toStrictEqual([]);
  });

  it('reports a file holding only error captures', () => {
    const source = ['let caught: unknown;', 'try {', '  parse(text);', '} catch (error) {', '  caught = error;', '}'];

    expect(listSites(source.join('\n'))).toStrictEqual([
      { kind: 'hand-rolled-error-capture', line: 2, symbol: 'caught' },
    ]);
  });

  it('reports a file holding only stdio spies', () => {
    const source = "vi.spyOn(process.stdout, 'write').mockImplementation(() => true);";

    expect(listSites(source)).toStrictEqual([{ kind: 'hand-rolled-stdio-capture', line: 1 }]);
  });

  it('interleaves every idiom in line order', () => {
    const source = [
      "vi.spyOn(process.stdout, 'write').mockImplementation(() => true);",
      'let caught: unknown;',
      'try {',
      '  parse(text);',
      '} catch (error) {',
      '  caught = error;',
      '}',
      "vi.spyOn(process.stderr, 'write').mockImplementation(() => true);",
    ];

    expect(listSites(source.join('\n'))).toStrictEqual([
      { kind: 'hand-rolled-stdio-capture', line: 1 },
      { kind: 'hand-rolled-error-capture', line: 3, symbol: 'caught' },
      { kind: 'hand-rolled-stdio-capture', line: 8 },
    ]);
  });
});
