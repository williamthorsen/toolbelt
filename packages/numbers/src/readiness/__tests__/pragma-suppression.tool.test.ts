import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLAMP = 'export const bounded = Math.max(min, Math.min(max, value));';
const ROUND = 'export const rate = Math.round(value * 100) / 100;\n';
const RANDOM = 'export const roll = Math.floor(Math.random() * sides);\n';
const ADOPTER = "import { round } from '@williamthorsen/toolbelt.numbers/candidate';\nround(value, 2);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The numbers adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${CLAMP}\n`)).toStrictEqual([
      { count: 4, detail: 'src/bound.ts:1', id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 4, detail: 'src/rate.ts:1', id: 'no-hand-rolled-round', passedCount: 1 },
      { count: 4, detail: 'src/roll.ts:1', id: 'no-hand-rolled-random-integer', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${CLAMP} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 3, detail: undefined, id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 3, detail: 'src/rate.ts:1', id: 'no-hand-rolled-round', passedCount: 1 },
      { count: 3, detail: 'src/roll.ts:1', id: 'no-hand-rolled-random-integer', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.numbers/no-hand-rolled-clamp`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${CLAMP} // rdy-ignore no-hand-rolled-clamp -- reviewed\n`)).toStrictEqual([
      { count: 3, detail: undefined, id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 4, detail: 'src/rate.ts:1', id: 'no-hand-rolled-round', passedCount: 1 },
      { count: 4, detail: 'src/roll.ts:1', id: 'no-hand-rolled-random-integer', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo holding the given clamp source, and reports what each
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(clampSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/bound.ts': clampSource,
    'src/rate.ts': ROUND,
    'src/roll.ts': RANDOM,
  });
}

// endregion | Helpers
