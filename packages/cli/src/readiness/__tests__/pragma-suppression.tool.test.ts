import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = [
  "import { defineGroup, runCli } from '@williamthorsen/toolbelt.cli/candidate';",
  'export const exitCode = await runCli(argv, defineGroup({ summary: "A tool", commands: {} }), options);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The cli adoption kit, run through rdy', () => {
  it('names each site under its own check and counts both in each denominator', () => {
    expect(runKit(buildRunner('', ''))).toStrictEqual([
      { count: 4, detail: 'src/run.ts:6', id: 'no-node-parse-args', passedCount: 2 },
      { count: 4, detail: 'run (src/run.ts:5)', id: 'no-hand-rolled-flag-scan', passedCount: 2 },
    ]);
  });

  it('drops the sites covered by an unqualified pragma from every check', () => {
    expect(runKit(buildRunner(' // rdy-ignore -- reviewed', ' // rdy-ignore -- reviewed'))).toStrictEqual([
      { count: 2, detail: undefined, id: 'no-node-parse-args', passedCount: 2 },
      { count: 2, detail: undefined, id: 'no-hand-rolled-flag-scan', passedCount: 2 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.cli/no-node-parse-args`.
  it('drops only the site of the check that a qualified pragma names', () => {
    expect(runKit(buildRunner('', ' // rdy-ignore no-node-parse-args -- reviewed'))).toStrictEqual([
      { count: 3, detail: undefined, id: 'no-node-parse-args', passedCount: 2 },
      { count: 4, detail: 'run (src/run.ts:5)', id: 'no-hand-rolled-flag-scan', passedCount: 2 },
    ]);
  });

  // The pragma drops the flag-scan line from the named check's denominator, where it counts alone.
  it('keeps a site in the report when the pragma names the other check', () => {
    expect(runKit(buildRunner(' // rdy-ignore no-node-parse-args -- reviewed', ''))).toStrictEqual([
      { count: 3, detail: 'src/run.ts:6', id: 'no-node-parse-args', passedCount: 2 },
      { count: 4, detail: 'run (src/run.ts:5)', id: 'no-hand-rolled-flag-scan', passedCount: 2 },
    ]);
  });
});

// region | Helpers

/** Builds a hand-rolled runner whose flag comparison and parseArgs call end with the given pragmas. */
function buildRunner(flagScanPragma: string, parseArgsPragma: string): string {
  return [
    "import { parseArgs } from 'node:util';",
    '',
    'export function run(args) {',
    '  const [command, ...rest] = args;',
    `  if (command === '--help') return HELP;${flagScanPragma}`,
    `  const { values } = parseArgs({ args: rest, options: {} });${parseArgsPragma}`,
    '  return values;',
    '}',
    '',
  ].join('\n');
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
