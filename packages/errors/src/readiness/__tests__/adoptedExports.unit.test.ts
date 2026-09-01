import { describe, expect, it } from 'vitest';

import * as candidateExports from '../../3-candidate/index.ts';
import * as releaseExports from '../../4-release/index.ts';
import { ADOPTED_EXPORTS } from '../adoptedExports.ts';

describe('ADOPTED_EXPORTS', () => {
  // Fails when a published tier gains a callable export that nothing added to the list adoption is counted against.
  it('names every export that a consumer calls', () => {
    const callable = [candidateExports, releaseExports].flatMap((tier) =>
      Object.entries(tier)
        .filter(([, value]) => typeof value === 'function')
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
