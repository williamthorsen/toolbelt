import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const SLEEP = 'export const waited = new Promise((resolve) => setTimeout(resolve, 50));';
const ADOPTER = "import { delay } from '@williamthorsen/toolbelt.async';\nawait delay(50);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The async adoption kit, run through rdy', () => {
  it('names the site and counts it in the denominator', () => {
    expect(runKit(`${SLEEP}\n`)).toStrictEqual([
      { count: 2, detail: 'src/wait.ts:1', id: 'no-hand-rolled-sleep', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(`${SLEEP} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-sleep', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.async/no-hand-rolled-sleep`.
  it('drops a site covered by a qualified pragma', () => {
    expect(runKit(`${SLEEP} // rdy-ignore no-hand-rolled-sleep -- reviewed\n`)).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-sleep', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo holding the given sleep source, and reports what the
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(sleepSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/wait.ts': sleepSource,
  });
}

// endregion | Helpers
