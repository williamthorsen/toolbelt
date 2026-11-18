import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CAPITALIZE = 'export const label = word.charAt(0).toUpperCase() + word.slice(1);';
const ADOPTER = "import { capitalize } from '@williamthorsen/toolbelt.strings/candidate';\ncapitalize(word);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The strings adoption kit, run through rdy', () => {
  // Every check counts the same two sites, the adopting call and the pragma's site, so a count one lower than
  // another check's shows that the pragma dropped the site from the named check alone.
  //
  // A `dir:` kit source has no namespace, so the id has no prefix. A consumer running the kit from the
  // installed package writes `toolbelt.strings/no-hand-rolled-capitalize`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    const reports = runKit(`${CAPITALIZE} // rdy-ignore no-hand-rolled-capitalize -- reviewed\n`);

    expect(
      reports.filter((report) => ['no-hand-rolled-capitalize', 'no-hand-rolled-pluralize'].includes(report.id)),
    ).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-capitalize', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-hand-rolled-pluralize', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo containing the given capitalize source, and reports what each
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report is passed to
 * the layer that acts on one.
 */
function runKit(capitalizeSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/label.ts': capitalizeSource,
  });
}

// endregion | Helpers
