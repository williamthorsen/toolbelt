import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const DESCRIBE_INLINE = 'export const message = error instanceof Error ? error.message : String(error);';
const ADOPTER = dedent`
  import { describeError } from '@williamthorsen/toolbelt.errors';
  export const message = describeError(error);

`;
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The errors adoption kit, run through rdy', () => {
  // Every check counts the same two sites, the adopting call and the pragma's site, so a count one lower than
  // another check's shows that the pragma dropped the site from the named check alone.
  //
  // A `dir:` kit source has no namespace, so the pragma uses the bare id. A consumer running the kit from the
  // installed package writes `toolbelt.errors/no-inline-description`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    const reports = runKit({
      'src/describe.ts': `${DESCRIBE_INLINE} // rdy-ignore no-inline-description -- reviewed\n`,
    });

    expect(
      reports.filter((report) => ['no-describe-clone', 'no-inline-description'].includes(report.id)),
    ).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-describe-clone', passedCount: 1 },
      { count: 1, detail: undefined, id: 'no-inline-description', passedCount: 1 },
    ]);
  });

  it('drops a single-code missing-path site covered by a pragma naming the partial check', () => {
    const reports = runKit({
      'src/partial.ts':
        "export const absent = error.code === 'ENOENT'; // rdy-ignore no-partial-missing-path-test -- reviewed\n",
    });

    expect(reports.filter((report) => report.id.includes('missing-path-test'))).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-missing-path-test', passedCount: 1 },
      { count: 1, detail: undefined, id: 'no-partial-missing-path-test', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/**
 * Runs the package's compiled kit over a fixture repo containing an adopting call and the given files, and reports
 * what each check named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report is delivered
 * to the layer that acts on one.
 */
function runKit(files: Record<string, string>): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/report.ts': ADOPTER,
    ...files,
  });
}

// endregion | Helpers
