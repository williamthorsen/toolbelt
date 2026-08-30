import { describe, expect, it } from 'vitest';

import { listStringIdioms } from '../listStringIdioms.ts';

describe(listStringIdioms, () => {
  it('names each idiom by its kind, merged in line order', () => {
    const source = [
      "const noun = count === 1 ? 'item' : 'items';",
      'const label = word.charAt(0).toUpperCase() + word.slice(1);',
      "const other = total !== 1 ? 's' : '';",
      '',
    ].join('\n');

    expect(listStringIdioms(source)).toStrictEqual([
      { kind: 'pluralize-inline', line: 1 },
      { kind: 'capitalize-inline', line: 2 },
      { kind: 'pluralize-inline', line: 3 },
    ]);
  });

  it('finds neither idiom in a comment', () => {
    const source = [
      '// const label = word.charAt(0).toUpperCase() + word.slice(1);',
      "/* const noun = count === 1 ? 'item' : 'items'; */",
      '',
    ].join('\n');

    expect(listStringIdioms(source)).toStrictEqual([]);
  });

  it('finds neither idiom in a string literal', () => {
    const source = [
      "const advice = 'replace word.charAt(0).toUpperCase() + word.slice(1)';",
      "const other = \"count === 1 ? 'item' : 'items'\";",
      '',
    ].join('\n');

    expect(listStringIdioms(source)).toStrictEqual([]);
  });

  it('finds nothing in a source holding neither idiom', () => {
    expect(listStringIdioms('export const total = values.length;\n')).toStrictEqual([]);
  });
});
