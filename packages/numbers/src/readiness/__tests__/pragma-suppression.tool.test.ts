import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLAMP = 'export const bounded = Math.max(min, Math.min(max, value));';
const ADOPTER = "import { round } from '@williamthorsen/toolbelt.numbers/candidate';\nround(value, 2);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The numbers adoption kit, run through rdy', () => {
  // Every check counts the same two sites, the adopting call and the pragma's site, so a count one lower than
  // another check's shows that the pragma dropped the site from the named check alone.
  //
  // A `dir:` kit source has no namespace, so the pragma names the bare id. A consumer running the kit from the
  // installed package writes `toolbelt.numbers/no-hand-rolled-clamp`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    const reports = runKit(`${CLAMP} // rdy-ignore no-hand-rolled-clamp -- reviewed\n`);

    expect(
      reports.filter((report) => ['no-hand-rolled-clamp', 'no-hand-rolled-round'].includes(report.id)),
    ).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-hand-rolled-round', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo holding the given clamp source, and reports what each
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report is delivered to
 * the layer that acts on one.
 */
function runKit(clampSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/bound.ts': clampSource,
  });
}

// endregion | Helpers
