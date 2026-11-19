import { listSiteLines } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listArraifySites } from '../listArraifySites.ts';

describe(listArraifySites, () => {
  it('claims a ternary passing an array through and wrapping anything else', () => {
    expect(listSiteLines(listArraifySites, 'const list = Array.isArray(value) ? value : [value];\n')).toStrictEqual([
      1,
    ]);
  });

  it('claims the negated ternary', () => {
    expect(listSiteLines(listArraifySites, 'const list = !Array.isArray(value) ? [value] : value;\n')).toStrictEqual([
      1,
    ]);
  });

  it('claims a ternary spreading the array into a new one', () => {
    const sources = [
      'const list = Array.isArray(value) ? [...value] : [value];\n',
      'const list = !Array.isArray(value) ? [value] : [...value];\n',
    ];

    expect(sources.map((source) => listSiteLines(listArraifySites, source))).toStrictEqual([[1], [1]]);
  });

  it('claims a subject reached through a property path', () => {
    expect(
      listSiteLines(listArraifySites, 'const list = Array.isArray(config.tags) ? config.tags : [config.tags];\n'),
    ).toStrictEqual([1]);
  });

  it('claims a ternary broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const list = Array.isArray(value)\n  ? value\n  : [value];\n';

    expect(listSiteLines(listArraifySites, source)).toStrictEqual([1]);
  });

  it('reports both polarities in line order', () => {
    const source = 'const a = !Array.isArray(one) ? [one] : one;\nconst b = Array.isArray(two) ? two : [two];\n';

    expect(listSiteLines(listArraifySites, source)).toStrictEqual([1, 2]);
  });

  it('declines a ternary whose branches name a value other than the subject', () => {
    const sources = [
      'const list = Array.isArray(value) ? value : [fallback];\n',
      'const list = Array.isArray(value) ? values : [value];\n',
      'const list = Array.isArray(value) ? value.slice() : [value];\n',
    ];

    expect(sources.filter((source) => listSiteLines(listArraifySites, source).length > 0)).toStrictEqual([]);
  });

  it('declines a guard used to branch rather than to wrap', () => {
    const source = 'if (Array.isArray(value)) {\n  return value.length;\n}\n';

    expect(listSiteLines(listArraifySites, source)).toStrictEqual([]);
  });
});
