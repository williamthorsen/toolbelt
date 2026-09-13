import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const MEMBERSHIP_TEST = 'export const known = Object.values(Color).includes(value);';
const ADOPTER =
  "import { isEnumValue } from '@williamthorsen/toolbelt.enums';\nexport const known = isEnumValue(Color, value);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The enums adoption kit, run through rdy', () => {
  it('names the site and counts it in the denominator', () => {
    expect(runKit(`${MEMBERSHIP_TEST}\n`)).toStrictEqual([
      { count: 2, detail: 'src/palette.ts:1', id: 'no-hand-rolled-enum-membership', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(`${MEMBERSHIP_TEST} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-enum-membership', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.enums/no-hand-rolled-enum-membership`.
  it('drops a site covered by a qualified pragma', () => {
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
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(source: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/palette.ts': source,
  });
}

// endregion | Helpers
