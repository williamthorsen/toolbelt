import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const MEMBERSHIP_TEST = 'export const known = Object.values(Color).includes(value);';
const ADOPTER =
  "import { isEnumValue } from '@williamthorsen/toolbelt.enums';\nexport const known = isEnumValue(Color, value);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The enums adoption kit, run through rdy', () => {
  // A `dir:` kit source has no namespace, so the pragma uses the bare id. A consumer running the kit from the
  // installed package writes `toolbelt.enums/no-hand-rolled-enum-membership`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${MEMBERSHIP_TEST} // rdy-ignore no-hand-rolled-enum-membership -- reviewed\n`)).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-enum-membership', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo containing the given source, and reports what the check
 * named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report is delivered
 * to the layer that acts on one.
 */
function runKit(source: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/palette.ts': source,
  });
}

// endregion | Helpers
