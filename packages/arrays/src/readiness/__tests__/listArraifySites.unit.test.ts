import { listSourceSites } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import { listArraifySites } from '../listArraifySites.ts';

describe(listArraifySites, () => {
  it('claims a ternary passing an array through and wrapping anything else', () => {
    expect(listLines('const list = Array.isArray(value) ? value : [value];\n')).toStrictEqual([1]);
  });

  it('claims the negated ternary', () => {
    expect(listLines('const list = !Array.isArray(value) ? [value] : value;\n')).toStrictEqual([1]);
  });

  it('claims a ternary spreading the array into a new one', () => {
    const sources = [
      'const list = Array.isArray(value) ? [...value] : [value];\n',
      'const list = !Array.isArray(value) ? [value] : [...value];\n',
    ];

    expect(sources.map((source) => listLines(source))).toStrictEqual([[1], [1]]);
  });

  it('claims a subject reached through a property path', () => {
    expect(listLines('const list = Array.isArray(config.tags) ? config.tags : [config.tags];\n')).toStrictEqual([1]);
  });

  it('claims a ternary broken across lines by a formatter, at the line on which it opens', () => {
    const source = 'const list = Array.isArray(value)\n  ? value\n  : [value];\n';

    expect(listLines(source)).toStrictEqual([1]);
  });

  it('reports both polarities in line order', () => {
    const source = 'const a = !Array.isArray(one) ? [one] : one;\nconst b = Array.isArray(two) ? two : [two];\n';

    expect(listLines(source)).toStrictEqual([1, 2]);
  });

  it('declines a ternary whose branches name a value other than the subject', () => {
    const sources = [
      'const list = Array.isArray(value) ? value : [fallback];\n',
      'const list = Array.isArray(value) ? values : [value];\n',
      'const list = Array.isArray(value) ? value.slice() : [value];\n',
    ];

    expect(sources.filter((source) => listLines(source).length > 0)).toStrictEqual([]);
  });

  it('declines a guard used to branch rather than to wrap', () => {
    const source = 'if (Array.isArray(value)) {\n  return value.length;\n}\n';

    expect(listLines(source)).toStrictEqual([]);
  });
});

// region | Helpers

/** Lists the lines of the sites that the detector finds in a source, blanked as the kit blanks it. */
function listLines(source: string): number[] {
  return listSourceSites([listArraifySites], source).map(({ line }) => line);
}

// endregion | Helpers
