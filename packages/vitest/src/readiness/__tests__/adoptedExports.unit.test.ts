import { diffAdoptedExports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

import * as proposedExports from '../../1-proposed/index.ts';
import * as draftExports from '../../2-draft/index.ts';
import * as candidateExports from '../../3-candidate/index.ts';
import * as releaseExports from '../../4-release/index.ts';
import { ADOPTED_EXPORTS } from '../adoptedExports.ts';

// Every tier published by the package's `exports` map.
const PUBLISHED_TIERS = [proposedExports, draftExports, candidateExports, releaseExports];
// A consumer catches `ProcessExitError` rather than calling it, so no mention of it counts as adoption.
const EXCLUDED_EXPORTS = ['ProcessExitError'];

describe('ADOPTED_EXPORTS', () => {
  const diff = diffAdoptedExports(PUBLISHED_TIERS, ADOPTED_EXPORTS);

  // Fails when a published tier gains a callable export missing from the list against which adoption is counted.
  it('names every export that a consumer calls', () => {
    expect(diff.callable).not.toHaveLength(0);
    expect(diff.omitted).toStrictEqual(EXCLUDED_EXPORTS);
  });

  it('names nothing a published tier does not export', () => {
    expect(diff.unexported).toStrictEqual([]);
  });
});
