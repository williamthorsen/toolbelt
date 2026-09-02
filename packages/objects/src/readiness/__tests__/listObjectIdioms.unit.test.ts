import { describe, expect, it } from 'vitest';

import { listObjectIdioms } from '../listObjectIdioms.ts';

describe(listObjectIdioms, () => {
  it('names each idiom by its kind, merged in line order', () => {
    const source = [
      'const has = Object.prototype.hasOwnProperty.call(target, key);',
      "const isRecord = typeof value === 'object' && value !== null;",
      'const same = JSON.stringify(a) === JSON.stringify(b);',
      '',
    ].join('\n');

    expect(listObjectIdioms(source)).toStrictEqual([
      { kind: 'own-property-call', line: 1 },
      { kind: 'record-inline', line: 2 },
      { kind: 'stringify-compare', line: 3 },
    ]);
  });

  it('finds no idiom in a comment', () => {
    const source = [
      '// Object.prototype.hasOwnProperty.call(target, key)',
      "/* typeof value === 'object' && value !== null */",
      '// JSON.stringify(a) === JSON.stringify(b)',
      '',
    ].join('\n');

    expect(listObjectIdioms(source)).toStrictEqual([]);
  });

  it('finds no idiom in a string literal', () => {
    const source = [
      "const a = 'Object.prototype.hasOwnProperty.call(target, key)';",
      'const b = "JSON.stringify(a) === JSON.stringify(b)";',
      '',
    ].join('\n');

    expect(listObjectIdioms(source)).toStrictEqual([]);
  });

  it('reports every idiom held by a single line', () => {
    const source =
      "const ok = Object.prototype.hasOwnProperty.call(v, k) && typeof v.x === 'object' && v.x !== null;\n";

    expect(listObjectIdioms(source)).toStrictEqual([
      { kind: 'own-property-call', line: 1 },
      { kind: 'record-inline', line: 1 },
    ]);
  });

  it('finds nothing in a source holding none of the idioms', () => {
    expect(listObjectIdioms('export function identity(value) {\n  return value;\n}\n')).toStrictEqual([]);
  });
});
