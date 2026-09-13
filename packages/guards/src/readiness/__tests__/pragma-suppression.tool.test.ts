import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = [
  "import { isString } from '@williamthorsen/toolbelt.guards';",
  'export const named = isString(value);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The guards adoption kit, run through rdy', () => {
  // Every check counts the same two sites, and only the adopting call passes. A site of another check's kind
  // raises the denominator without raising the numerator, so the fraction reports how far adoption of the
  // package got rather than how clean one check is.
  it('names the site under its own check and counts it against every fraction', () => {
    expect(runKit(buildGuard(''))).toStrictEqual([
      { count: 2, detail: 'check (src/guard.ts:1)', id: 'no-assertion-clone', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-predicate-clone', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-number-guard-clone', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(buildGuard(' // rdy-ignore -- reviewed'))[0]).toStrictEqual({
      count: 1,
      detail: undefined,
      id: 'no-assertion-clone',
      passedCount: 1,
    });
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.guards/no-assertion-clone`.
  it('drops a site covered by a qualified pragma', () => {
    expect(runKit(buildGuard(' // rdy-ignore no-assertion-clone -- reviewed'))[0]).toStrictEqual({
      count: 1,
      detail: undefined,
      id: 'no-assertion-clone',
      passedCount: 1,
    });
  });

  it('leaves a site standing where the pragma names another check', () => {
    expect(runKit(buildGuard(' // rdy-ignore no-number-guard-clone -- reviewed'))[0]).toStrictEqual({
      count: 2,
      detail: 'check (src/guard.ts:1)',
      id: 'no-assertion-clone',
      passedCount: 1,
    });
  });
});

// region | Helpers

/** Builds a hand-rolled assertion whose head line carries the given trailing pragma. */
function buildGuard(pragma: string): string {
  return [
    `export function check(condition, message) {${pragma}`,
    '  if (!condition) throw new Error(message);',
    '}',
    '',
  ].join('\n');
}

/**
 * Runs the package's compiled kit over a fixture repo holding the given guard source, and reports what each
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(guardSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/guard.ts': guardSource,
  });
}

// endregion | Helpers
