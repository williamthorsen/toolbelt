import { describe, expect, it } from 'vitest';

import { findEnclosingBody } from '../findEnclosingBody.ts';
import { listFunctionBodies } from '../listFunctionBodies.ts';

const SOURCE = 'const top = 1;\nfunction outer() { const inner = () => { return 2; }; return 3; }';
const BODIES = listFunctionBodies(SOURCE);

describe(findEnclosingBody, () => {
  it('returns the innermost of nested bodies', () => {
    expect(findEnclosingBody(BODIES, SOURCE.indexOf('return 2'))?.name).toBe('inner');
  });

  it('returns the outer body for an offset outside the nested one', () => {
    expect(findEnclosingBody(BODIES, SOURCE.indexOf('return 3'))?.name).toBe('outer');
  });

  it('returns undefined for an offset outside every body', () => {
    expect(findEnclosingBody(BODIES, SOURCE.indexOf('top'))).toBeUndefined();
  });

  it('counts the opening brace as inside the body', () => {
    const inner = BODIES.find((body) => body.name === 'inner');

    expect(inner).toBeDefined();
    expect(findEnclosingBody(BODIES, inner?.bodyStart ?? -1)?.name).toBe('inner');
  });

  it('counts the offset past the closing brace as outside the body', () => {
    const outer = BODIES.find((body) => body.name === 'outer');

    expect(outer).toBeDefined();
    expect(findEnclosingBody(BODIES, outer?.bodyEnd ?? -1)).toBeUndefined();
  });
});
