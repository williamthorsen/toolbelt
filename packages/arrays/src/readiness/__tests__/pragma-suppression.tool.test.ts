import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ARRAIFY = 'export const list = Array.isArray(value) ? value : [value];';
const ADOPTER = "import { pickItem } from '@williamthorsen/toolbelt.arrays';\npickItem(items);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The arrays adoption kit, run through rdy', () => {
  // Every check counts the same two sites, the adopting call and the pragma's site, so a count one lower than
  // another check's shows that the pragma dropped the site from the named check alone.
  //
  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.arrays/no-hand-rolled-arraify`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    const reports = runKit(`${ARRAIFY} // rdy-ignore no-hand-rolled-arraify -- reviewed\n`);

    expect(
      reports.filter((report) => ['no-biased-shuffle', 'no-hand-rolled-arraify'].includes(report.id)),
    ).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-biased-shuffle', passedCount: 1 },
      { count: 1, detail: undefined, id: 'no-hand-rolled-arraify', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo containing the given array-wrap source, and reports what
 * each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report arrives at
 * the layer that acts on one.
 */
function runKit(wrapSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/wrap.ts': wrapSource,
  });
}

// endregion | Helpers
