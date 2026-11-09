import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = dedent`
  import { defineGroup, runCli } from '@williamthorsen/toolbelt.cli/candidate';
  export const exitCode = await runCli(argv, defineGroup({ summary: "A tool", commands: {} }), options);

`;
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The cli adoption kit, run through rdy', () => {
  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.cli/no-node-parse-args`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(buildRunner(' // rdy-ignore no-node-parse-args -- reviewed'))).toStrictEqual([
      { count: 3, detail: undefined, id: 'no-node-parse-args', passedCount: 2 },
      { count: 4, detail: 'run (src/run.ts:5)', id: 'no-hand-rolled-flag-scan', passedCount: 2 },
    ]);
  });
});

// region | Helpers

/** Builds a hand-rolled runner whose parseArgs call ends with the given pragma. */
function buildRunner(pragma: string): string {
  return dedent`
    import { parseArgs } from 'node:util';

    export function run(args) {
      const [command, ...rest] = args;
      if (command === '--help') return HELP;
      const { values } = parseArgs({ args: rest, options: {} });${pragma}
      return values;
    }

  `;
}

/**
 * Runs the package's compiled kit over a fixture repo containing the given source, and reports what each check
 * named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report arrives at
 * the layer that acts on one.
 */
function runKit(source: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/run.ts': source,
  });
}

// endregion | Helpers
