import { createKitFixture, runCheck, runSkip, selectCheck } from '@williamthorsen/toolbelt.adoption/test-utils';
import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

const KIT_URL = new URL('../../../.readyup/kits/default.ts', import.meta.url);
const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.cli', version: '1.0.0' });

// A runner of the shape that the toolbelt bins used before they adopted `runCli`.
const RUNNER = dedent`
  import { parseArgs } from 'node:util';

  export function run(args) {
    const [command, ...rest] = args;
    if (command === '--help' || command === '-h') return HELP;
    const { values } = parseArgs({ args: rest, options: {} });
    return values;
  }

`;
// The package's own runCli, written with the comparisons that its check reports.
const OWN_RUN_CLI = dedent`
  export function runCli(argv, root) {
    if (argv[0] === '--help') return 0;
    return dispatch(argv, root);
  }

`;
const ADOPTER = dedent`
  import { defineGroup, runCli } from '@williamthorsen/toolbelt.cli/candidate';
  export const exitCode = await runCli(argv, defineGroup({ summary: "A tool", commands: {} }), options);

`;

describe('The cli adoption kit', () => {
  it('reports each kind under its own check, and counts both against calls into the package', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': MANIFEST,
      'src/adopter.ts': ADOPTER,
      'src/run.ts': RUNNER,
    });
    const parseArgsCheck = selectCheck(kit.checks, 'no-node-parse-args');
    const flagScanCheck = selectCheck(kit.checks, 'no-hand-rolled-flag-scan');

    await expect(runCheck(parseArgsCheck)).resolves.toStrictEqual({
      adoptedCount: 2,
      findings: [
        { line: 5, path: 'src/run.ts', reported: false, symbol: 'run' },
        { line: 6, path: 'src/run.ts', reported: true },
      ],
    });
    await expect(runCheck(flagScanCheck)).resolves.toStrictEqual({
      adoptedCount: 2,
      findings: [
        { line: 5, path: 'src/run.ts', reported: true, symbol: 'run' },
        { line: 6, path: 'src/run.ts', reported: false },
      ],
    });
  });

  it('sweeps a runner under bin/ and src/bin/, and leaves a test alone', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'bin/cli.js': RUNNER,
      'package.json': MANIFEST,
      'src/bin/__tests__/run.unit.test.ts': RUNNER,
      'src/bin/run.ts': RUNNER,
    });
    const parseArgsCheck = selectCheck(kit.checks, 'no-node-parse-args');

    await expect(runCheck(parseArgsCheck)).resolves.toMatchObject({
      findings: [
        { line: 5, path: 'bin/cli.js', reported: false },
        { line: 6, path: 'bin/cli.js', reported: true },
        { line: 5, path: 'src/bin/run.ts', reported: false },
        { line: 6, path: 'src/bin/run.ts', reported: true },
      ],
    });
  });

  it('exempts the package’s own runCli, and reports a hand-roll beside it', async () => {
    using kit = await createKitFixture(KIT_URL, {
      'package.json': PUBLISHER_MANIFEST,
      'src/run.ts': RUNNER,
      'src/runCli.ts': OWN_RUN_CLI,
    });
    const flagScanCheck = selectCheck(kit.checks, 'no-hand-rolled-flag-scan');

    await expect(runCheck(flagScanCheck)).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [
        { line: 5, path: 'src/run.ts', reported: true, symbol: 'run' },
        { line: 6, path: 'src/run.ts', reported: false },
      ],
    });
  });

  it('skips the checks when the sweep matches no source', async () => {
    using kit = await createKitFixture(KIT_URL, { 'package.json': MANIFEST, 'src/__tests__/run.unit.test.ts': RUNNER });
    const checks = kit.checks;

    await expect(Promise.all(checks.map((check) => runSkip(check)))).resolves.toStrictEqual([
      'the project contains no JavaScript or TypeScript sources outside its tests',
      'the project contains no JavaScript or TypeScript sources outside its tests',
    ]);
  });
});
