import { describe, expect, it } from 'vitest';

import * as proposedExports from '../../1-proposed/index.ts';
import * as draftExports from '../../2-draft/index.ts';
import * as candidateExports from '../../3-candidate/index.ts';
import * as releaseExports from '../../4-release/index.ts';
import { ADOPTED_EXPORTS } from '../adoptedExports.ts';

// Every tier the package's `exports` map publishes. `errors` and `vitest` scan the last two alone; this
// package puts `makeRng` in `1-proposed`, which a two-tier sweep would miss while still passing.
const PUBLISHED_TIERS = [proposedExports, draftExports, candidateExports, releaseExports];

describe('ADOPTED_EXPORTS', () => {
  // Fails when a published tier gains a callable export that nothing added to the list adoption is counted against.
  it('names every export a consumer calls', () => {
    const callable = PUBLISHED_TIERS.flatMap((tier) =>
      Object.entries(tier)
        .filter(([, value]) => typeof value === 'function')
        .map(([name]) => name),
    );

    expect(callable).not.toHaveLength(0);
    expect(callable.filter((name) => !ADOPTED_EXPORTS.includes(name))).toStrictEqual([]);
  });

  it('names nothing a published tier does not export', () => {
    const exported = new Set(PUBLISHED_TIERS.flatMap((tier) => Object.keys(tier)));

    expect(ADOPTED_EXPORTS.filter((name) => !exported.has(name))).toStrictEqual([]);
  });
});
