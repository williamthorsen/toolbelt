import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const RECORD = "export const ok = typeof value === 'object' && value !== null;";
const ADOPTER = "import { isRecord } from '@williamthorsen/toolbelt.objects';\nisRecord(value);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The objects adoption kit, run through rdy', () => {
  // Every check counts the same two sites, the adopting call and the pragma's site, so a count one lower than
  // another check's shows that the pragma dropped the site from the named check alone.
  //
  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.objects/no-hand-rolled-record-guard`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    const reports = runKit(`${RECORD} // rdy-ignore no-hand-rolled-record-guard -- reviewed\n`);

    expect(
      reports.filter((report) => ['no-hand-rolled-own-property', 'no-hand-rolled-record-guard'].includes(report.id)),
    ).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 1, detail: undefined, id: 'no-hand-rolled-record-guard', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo containing the given record-guard source, and reports what
 * each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report arrives at
 * the layer that acts on one.
 */
function runKit(recordSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/guard.ts': recordSource,
  });
}

// endregion | Helpers
