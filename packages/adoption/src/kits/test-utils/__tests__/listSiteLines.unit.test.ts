import { describe, expect, it } from 'vitest';

import { listSiteLines } from '../listSiteLines.ts';

describe(listSiteLines, () => {
  it('lists the lines of the sites in line order', () => {
    const detector = () => [
      { kind: 'idiom', line: 3 },
      { kind: 'idiom', line: 1 },
    ];

    expect(listSiteLines(detector, 'first\nsecond\nthird\n')).toStrictEqual([1, 3]);
  });

  it('hands the detector the blanked code', () => {
    const detector = (code: string) => (code.includes('idiom') ? [{ kind: 'idiom', line: 1 }] : []);

    expect(listSiteLines(detector, '// idiom\n')).toStrictEqual([]);
  });
});
