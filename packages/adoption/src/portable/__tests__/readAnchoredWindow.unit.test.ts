import { describe, expect, it } from 'vitest';

import { readAnchoredWindow } from '../readAnchoredWindow.ts';

const LENGTHS = { lookahead: 40, lookbehind: 20 };

describe(readAnchoredWindow, () => {
  it('opens the trailing window at the anchor itself', () => {
    const source = 'if (error instanceof Error) throw error;';

    expect(readAnchoredWindow(source, source.indexOf('instanceof'), LENGTHS).after).toBe(
      'instanceof Error) throw error;',
    );
  });

  it('ends the leading window at the anchor', () => {
    const source = 'if (error instanceof Error) throw error;';

    expect(readAnchoredWindow(source, source.indexOf('instanceof'), LENGTHS).before).toBe('if (error ');
  });

  it('condenses both windows, so a wrapped site reads as one line', () => {
    const source = 'const m =\n  error\n    instanceof Error\n    ? error.message\n    : fallback;';
    const whole = { lookahead: source.length, lookbehind: source.length };

    expect(readAnchoredWindow(source, source.indexOf('instanceof'), whole)).toStrictEqual({
      after: 'instanceof Error ? error.message : fallback;',
      before: 'const m = error ',
    });
  });

  it('clamps the leading window at the start of the source', () => {
    expect(readAnchoredWindow('abc', 1, LENGTHS).before).toBe('a');
  });

  it('clamps the trailing window at the end of the source', () => {
    expect(readAnchoredWindow('abc', 1, LENGTHS).after).toBe('bc');
  });
});
