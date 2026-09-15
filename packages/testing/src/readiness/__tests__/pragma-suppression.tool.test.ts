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
const STDIO_SPY = "vi.spyOn(process.stdout, 'write').mockImplementation(() => true);\n";

describe('The testing adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(buildCapture(''))).toStrictEqual([
      { count: 3, detail: 'caught (src/config.unit.test.ts:3)', id: 'no-hand-rolled-error-capture', passedCount: 1 },
      { count: 3, detail: 'src/output.unit.test.ts:1', id: 'no-hand-rolled-stdio-capture', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(buildCapture(' // rdy-ignore -- reviewed'))).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-hand-rolled-error-capture', passedCount: 1 },
      { count: 2, detail: 'src/output.unit.test.ts:1', id: 'no-hand-rolled-stdio-capture', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.testing/no-hand-rolled-error-capture`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(buildCapture(' // rdy-ignore no-hand-rolled-error-capture -- reviewed'))).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-hand-rolled-error-capture', passedCount: 1 },
      { count: 3, detail: 'src/output.unit.test.ts:1', id: 'no-hand-rolled-stdio-capture', passedCount: 1 },
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
 * Runs the package's compiled kit over a fixture repo holding the given capture source and a stdio spy, and
 * reports what each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(captureSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.unit.test.ts': ADOPTER,
    'src/config.unit.test.ts': captureSource,
    'src/output.unit.test.ts': STDIO_SPY,
  });
}

// endregion | Helpers
