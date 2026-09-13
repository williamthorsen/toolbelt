import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = [
  "import { captureError } from '@williamthorsen/toolbelt.testing';",
  'const caught = await captureError(() => parseConfig(text));',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The testing adoption kit, run through rdy', () => {
  it('names the site and counts it in the denominator', () => {
    expect(runKit(buildCapture(''))).toStrictEqual([
      { count: 2, detail: 'caught (src/config.unit.test.ts:3)', id: 'no-hand-rolled-error-capture', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(buildCapture(' // rdy-ignore -- reviewed'))).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-error-capture', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.testing/no-hand-rolled-error-capture`.
  it('drops a site covered by a qualified pragma', () => {
    expect(runKit(buildCapture(' // rdy-ignore no-hand-rolled-error-capture -- reviewed'))).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-error-capture', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/** Builds a captured-error test source whose `try` carries the given trailing pragma. */
function buildCapture(pragma: string): string {
  return [
    'let caught: unknown;',
    '',
    `try {${pragma}`,
    '  parseConfig(text);',
    '} catch (error) {',
    '  caught = error;',
    '}',
    '',
  ].join('\n');
}

/**
 * Runs the package's compiled kit over a fixture repo holding the given capture source, and reports what the
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(captureSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.unit.test.ts': ADOPTER,
    'src/config.unit.test.ts': captureSource,
  });
}

// endregion | Helpers
