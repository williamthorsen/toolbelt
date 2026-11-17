import { describe, expect, it } from 'vitest';

import { findEnclosingBlockEnd } from '../findEnclosingBlockEnd.ts';

describe(findEnclosingBlockEnd, () => {
  it('returns the offset of the closing brace of the enclosing block', () => {
    const code = '{ a; b; }';

    expect(findEnclosingBlockEnd(code, code.indexOf('b'))).toBe(code.lastIndexOf('}'));
  });

  it('skips a nested block past the offset', () => {
    const code = '{ a; if (x) { b; } c; }';

    expect(findEnclosingBlockEnd(code, code.indexOf('if'))).toBe(code.lastIndexOf('}'));
  });

  it('returns nothing when no block encloses the offset', () => {
    expect(findEnclosingBlockEnd('a; { b; }', 0)).toBeUndefined();
  });
});
