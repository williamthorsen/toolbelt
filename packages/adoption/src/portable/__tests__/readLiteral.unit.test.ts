import { describe, expect, it } from 'vitest';

import { readLiteral } from '../readLiteral.ts';

const SOURCE = "const tag = 'object';";
// The span reported by a `'d'`-flag match for the quoted literal, quotes included.
const LITERAL_SPAN = [12, 20];

describe(readLiteral, () => {
  it('reads the literal named by a span, without its quotes', () => {
    expect(readLiteral(SOURCE, LITERAL_SPAN)).toBe('object');
  });

  it('reads an empty literal as the empty string', () => {
    expect(readLiteral("const empty = '';", [14, 16])).toBe('');
  });

  it('reads the source beneath a blanked literal, the two texts sharing every offset', () => {
    const blank = ' '.repeat('object'.length);
    const blanked = `const tag = '${blank}';`;

    expect(readLiteral(SOURCE, LITERAL_SPAN)).toBe('object');
    expect(readLiteral(blanked, LITERAL_SPAN)).toBe(blank);
  });

  it('reads nothing where the match captured no such group', () => {
    expect(readLiteral(SOURCE, undefined)).toBeUndefined();
  });

  it('reads nothing where the span carries no end', () => {
    expect(readLiteral(SOURCE, [12])).toBeUndefined();
  });
});
