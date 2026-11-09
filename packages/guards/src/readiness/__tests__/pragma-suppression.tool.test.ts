import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
// rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on guards through arrays, so guards cannot import dedent without a cycle
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
  //
  // The pragma uses the bare id because a `dir:` kit source has no namespace. A consumer running the kit
  // from the installed package writes `toolbelt.guards/no-assertion-clone`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(buildGuard(' // rdy-ignore no-assertion-clone -- reviewed'))).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-assertion-clone', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-predicate-clone', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-number-guard-clone', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/** Builds a hand-rolled assertion whose head line ends with the given pragma. */
function buildGuard(pragma: string): string {
  // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on guards through arrays, so guards cannot import dedent without a cycle
  return [
    `export function check(condition, message) {${pragma}`,
    '  if (!condition) throw new Error(message);',
    '}',
    '',
  ].join('\n');
}

/**
 * Runs the package's compiled kit over a fixture repo containing the given guard source, and reports what each
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report arrives at
 * the layer that acts on one.
 */
function runKit(guardSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/guard.ts': guardSource,
  });
}

// endregion | Helpers
