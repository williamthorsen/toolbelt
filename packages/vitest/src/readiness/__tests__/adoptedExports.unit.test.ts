import { describe, expect, it } from 'vitest';

import * as candidateExports from '../../3-candidate/index.ts';
import * as releaseExports from '../../4-release/index.ts';
import { ADOPTED_EXPORTS } from '../adoptedExports.ts';

// A consumer catches `ProcessExitError` rather than calling it, so no mention of it counts as adoption.
const UNCALLED_EXPORTS = new Set(['ProcessExitError']);

describe('ADOPTED_EXPORTS', () => {
  // Fails when a published tier gains a callable export that nothing added to the list adoption is counted against.
  it('names every export that a consumer calls', () => {
    const callable = [candidateExports, releaseExports].flatMap((tier) =>
      Object.entries(tier)
        .filter(([name, value]) => typeof value === 'function' && !UNCALLED_EXPORTS.has(name))
        .map(([name]) => name),
    );

    expect(callable).not.toHaveLength(0);
    expect(callable.filter((name) => !ADOPTED_EXPORTS.includes(name))).toStrictEqual([]);
  });

  it('names nothing a published tier does not export', () => {
    const exported = new Set([candidateExports, releaseExports].flatMap((tier) => Object.keys(tier)));

    expect(ADOPTED_EXPORTS.filter((name) => !exported.has(name))).toStrictEqual([]);
  });
});
