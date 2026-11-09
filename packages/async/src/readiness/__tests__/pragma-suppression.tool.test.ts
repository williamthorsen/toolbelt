import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const SLEEP = 'export const waited = new Promise((resolve) => setTimeout(resolve, 50));';
const ADOPTER = "import { delay } from '@williamthorsen/toolbelt.async';\nawait delay(50);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The async adoption kit, run through rdy', () => {
  // A `dir:` kit source has no namespace, so the pragma names the bare id. A consumer running the kit from the
  // installed package writes `toolbelt.async/no-hand-rolled-sleep`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${SLEEP} // rdy-ignore no-hand-rolled-sleep -- reviewed\n`)).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-sleep', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo containing the given sleep source, and reports what the
 * check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that the runner acts on a kit's
 * report.
 */
function runKit(sleepSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/wait.ts': sleepSource,
  });
}

// endregion | Helpers
