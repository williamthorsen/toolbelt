import { createTrackedRepo, pointCwdAt, runCheck, runSkip } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.cli', version: '1.0.0' });

// A runner of the shape that the toolbelt bins used before they adopted `runCli`.
const RUNNER = [
  "import { parseArgs } from 'node:util';",
  '',
  'export function run(args) {',
  '  const [command, ...rest] = args;',
  "  if (command === '--help' || command === '-h') return HELP;",
  '  const { values } = parseArgs({ args: rest, options: {} });',
  '  return values;',
  '}',
  '',
].join('\n');
// The package's own runCli, written with the comparisons that its check reports.
const OWN_RUN_CLI = [
  'export function runCli(argv, root) {',
  "  if (argv[0] === '--help') return 0;",
  '  return dispatch(argv, root);',
  '}',
  '',
].join('\n');
const ADOPTER = [
  "import { defineGroup, runCli } from '@williamthorsen/toolbelt.cli/candidate';",
  'export const exitCode = await runCli(argv, defineGroup({ summary: "A tool", commands: {} }), options);',
  '',
].join('\n');

describe('The cli adoption kit', () => {
  it('reports each kind under its own check, and counts both against calls into the package', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/adopter.ts': ADOPTER, 'src/run.ts': RUNNER });
    using _cwd = pointCwdAt(tree.dir);
    const [parseArgsCheck, flagScanCheck] = await loadChecks();

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
    using tree = createTrackedRepo({
      'bin/cli.js': RUNNER,
      'package.json': MANIFEST,
      'src/bin/__tests__/run.unit.test.ts': RUNNER,
      'src/bin/run.ts': RUNNER,
    });
    using _cwd = pointCwdAt(tree.dir);
    const [parseArgsCheck] = await loadChecks();

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
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/run.ts': RUNNER,
      'src/runCli.ts': OWN_RUN_CLI,
    });
    using _cwd = pointCwdAt(tree.dir);
    const [, flagScanCheck] = await loadChecks();

    await expect(runCheck(flagScanCheck)).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [
        { line: 5, path: 'src/run.ts', reported: true, symbol: 'run' },
        { line: 6, path: 'src/run.ts', reported: false },
      ],
    });
  });

  it('skips the checks when the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/__tests__/run.unit.test.ts': RUNNER });
    using _cwd = pointCwdAt(tree.dir);
    const checks = await loadChecks();

    await expect(Promise.all(checks.map((check) => runSkip(check)))).resolves.toStrictEqual([
      'the project contains no JavaScript or TypeScript sources outside its tests',
      'the project contains no JavaScript or TypeScript sources outside its tests',
    ]);
  });
});

// region | Helpers

/**
 * Loads a fresh kit and lists its adoption checks, which the flat checklist contains in declaration order.
 *
 * A kit keeps its project sweep in its own closure, so one import would give every test here the first
 * fixture repo's findings. Resetting the registry leaves each test with a kit that has swept nothing yet.
 */
async function loadChecks(): Promise<readonly RdyCheck[]> {
  vi.resetModules();
  const kit = (await import('../../../.readyup/kits/default.ts')).default;

  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return [];
  return checklist.checks;
}

// endregion | Helpers
