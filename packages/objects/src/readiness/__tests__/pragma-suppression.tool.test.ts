import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const RECORD = "export const ok = typeof value === 'object' && value !== null;";
const OWN_PROPERTY = 'export const has = Object.prototype.hasOwnProperty.call(target, key);\n';
const STRINGIFY = 'export const same = JSON.stringify(a) === JSON.stringify(b);\n';
const ADOPTER = "import { isRecord } from '@williamthorsen/toolbelt.objects';\nisRecord(value);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The objects adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${RECORD}\n`)).toStrictEqual([
      { count: 4, detail: 'src/has.ts:1', id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 4, detail: 'src/guard.ts:1', id: 'no-hand-rolled-record-guard', passedCount: 1 },
      { count: 4, detail: 'src/same.ts:1', id: 'no-stringify-comparison', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${RECORD} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 3, detail: 'src/has.ts:1', id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 3, detail: undefined, id: 'no-hand-rolled-record-guard', passedCount: 1 },
      { count: 3, detail: 'src/same.ts:1', id: 'no-stringify-comparison', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.objects/no-hand-rolled-record-guard`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${RECORD} // rdy-ignore no-hand-rolled-record-guard -- reviewed\n`)).toStrictEqual([
      { count: 4, detail: 'src/has.ts:1', id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 3, detail: undefined, id: 'no-hand-rolled-record-guard', passedCount: 1 },
      { count: 4, detail: 'src/same.ts:1', id: 'no-stringify-comparison', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo holding the given record-guard source, and reports what
 * each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(recordSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/guard.ts': recordSource,
    'src/has.ts': OWN_PROPERTY,
    'src/same.ts': STRINGIFY,
  });
}

// endregion | Helpers
