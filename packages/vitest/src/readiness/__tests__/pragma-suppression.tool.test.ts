import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const SILENCE = "vi.spyOn(console, 'warn').mockImplementation(() => {});";
const ADOPTER = dedent`
  import { throwOnProcessExit } from '@williamthorsen/toolbelt.vitest';
  using _exit = throwOnProcessExit();

`;
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The vitest adoption kit, run through rdy', () => {
  // Every check counts the same two sites, the adopting call and the pragma's site, so a count one lower than
  // another check's shows that the pragma dropped the site from the named check alone.
  //
  // A `dir:` kit source has no namespace, so the pragma names the check by its bare id. A consumer running the
  // kit from the installed package writes `toolbelt.vitest/no-hand-rolled-console-silence`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    const reports = runKit(`${SILENCE} // rdy-ignore no-hand-rolled-console-silence -- reviewed\n`);

    expect(
      reports.filter((report) => ['no-exit-sentinel-clone', 'no-hand-rolled-console-silence'].includes(report.id)),
    ).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-exit-sentinel-clone', passedCount: 1 },
      { count: 1, detail: undefined, id: 'no-hand-rolled-console-silence', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo whose `src/silence.unit.test.ts` contains the given source,
 * and reports what each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that the runner applies the
 * pragma to a kit's report.
 */
function runKit(silenceSource: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/exit.unit.test.ts': ADOPTER,
    'src/silence.unit.test.ts': silenceSource,
  });
}

// endregion | Helpers
