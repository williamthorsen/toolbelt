import { describe, expect, it } from 'vitest';

import type { AdoptionSite } from '../defineAdoptionKit.ts';
import { listSourceSites } from '../listSourceSites.ts';

describe(listSourceSites, () => {
  it('hands each detector the blanked code and the source at equal offsets', () => {
    const source = "const a = 'idiom'; // idiom\n";
    const received: Array<[string, string]> = [];

    listSourceSites(
      [
        (code, text) => {
          received.push([code, text]);
          return [];
        },
      ],
      source,
    );

    const [[code, text] = ['', '']] = received;
    expect(text).toBe(source);
    expect(code).toHaveLength(source.length);
    expect(code).not.toContain('idiom');
    expect(code.startsWith('const a = ')).toBe(true);
  });

  it('merges the sites of every detector in line order', () => {
    const source = 'first\nsecond\nthird\n';

    expect(listSourceSites([listLines('odd', [3, 1]), listLines('even', [2])], source)).toStrictEqual([
      { kind: 'odd', line: 1 },
      { kind: 'even', line: 2 },
      { kind: 'odd', line: 3 },
    ]);
  });
});

// region | Helpers

/** Builds a detector that reports the given lines under one kind, whatever the source. */
function listLines<Kind extends string>(kind: Kind, lines: readonly number[]): () => Array<AdoptionSite<Kind>> {
  return () => lines.map((line) => ({ kind, line }));
}

// endregion | Helpers
