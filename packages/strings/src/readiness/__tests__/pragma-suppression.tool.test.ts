import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CAPITALIZE = 'export const label = word.charAt(0).toUpperCase() + word.slice(1);';
const PLURALIZE = "export const noun = count === 1 ? 'item' : 'items';\n";
const ADOPTER = "import { capitalize } from '@williamthorsen/toolbelt.strings/candidate';\ncapitalize(word);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The strings adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${CAPITALIZE}\n`)).toStrictEqual([
      { count: 3, detail: 'src/label.ts:1', id: 'no-hand-rolled-capitalize', passedCount: 1 },
      { count: 3, detail: 'src/noun.ts:1', id: 'no-hand-rolled-pluralize', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${CAPITALIZE} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-hand-rolled-capitalize', passedCount: 1 },
      { count: 2, detail: 'src/noun.ts:1', id: 'no-hand-rolled-pluralize', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.strings/no-hand-rolled-capitalize`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${CAPITALIZE} // rdy-ignore no-hand-rolled-capitalize -- reviewed\n`)).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-hand-rolled-capitalize', passedCount: 1 },
      { count: 3, detail: 'src/noun.ts:1', id: 'no-hand-rolled-pluralize', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo holding the given capitalize source, and reports what
 * each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(capitalizeSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/label.ts': capitalizeSource,
    'src/noun.ts': PLURALIZE,
  });
}

// endregion | Helpers
