import {
  createTrackedRepo,
  listReportedFindings,
  pointCwdAt,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.vitest', version: '1.0.0' });

const CAPTURE = "vi.spyOn(console, 'log').mockImplementation((...args) => { lines.push(args); });\n";
const CONSOLE_SPY_ONLY = "vi.spyOn(console, 'debug');\n";
const DISPOSAL = [
  "it('builds a tree', () => {",
  '  const tree = createTempTree({});',
  '  onTestFinished(() => tree[Symbol.dispose]());',
  '});',
  '',
].join('\n');
const LOSSY_CAPTURE = "vi.spyOn(console, 'error').mockImplementation((message) => { lines.push(message); });\n";
const NON_THROWING = "vi.spyOn(process, 'exit').mockImplementation(() => {});\n";
const READ = ["using silent = silenceConsole(['warn']);", 'expect(silent.warn.mock.calls).toHaveLength(1);', ''].join(
  '\n',
);
const SENTINEL_CLONE = [
  'class ExitError extends Error {}',
  '',
  'beforeEach(() => {',
  "  vi.spyOn(process, 'exit').mockImplementation((code) => {",
  '    throw new ExitError(code);',
  '  });',
  '});',
  '',
].join('\n');
const SILENCE = "vi.spyOn(console, 'warn').mockImplementation(() => {});\n";
const THROWING = ["vi.spyOn(process, 'exit').mockImplementation(() => {", "  throw new Error('exit');", '});', ''].join(
  '\n',
);
const UNREADABLE_EXIT_MOCK = "vi.spyOn(process, 'exit').mockImplementation(handleExit);\n";
// A spy on a method for which the package has no advice, and a `mock.calls` read on a spy that is no console spy.
const UNCLAIMED = [
  "vi.spyOn(console, 'table').mockImplementation(() => {});",
  "const existsSyncSpy = vi.spyOn(fs, 'existsSync').mockReturnValue(true);",
  'expect(existsSyncSpy.mock.calls).toHaveLength(2);',
  '',
].join('\n');
const ADOPTER = [
  "import { throwOnProcessExit } from '@williamthorsen/toolbelt.vitest';",
  'using _exit = throwOnProcessExit();',
  '',
].join('\n');
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/capture.unit.test.ts': CAPTURE,
  'src/dispose.unit.test.ts': DISPOSAL,
  'src/lossy.unit.test.ts': LOSSY_CAPTURE,
  'src/non-throwing.unit.test.ts': NON_THROWING,
  'src/read.unit.test.ts': READ,
  'src/sentinel.unit.test.ts': SENTINEL_CLONE,
  'src/silence.unit.test.ts': SILENCE,
  'src/spy-only.unit.test.ts': CONSOLE_SPY_ONLY,
  'src/throwing.unit.test.ts': THROWING,
  'src/unreadable.unit.test.ts': UNREADABLE_EXIT_MOCK,
};

describe('The vitest adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    // Nine kinds over eight checks: `no-hand-rolled-exit-mock` takes the throwing and the unreadable mock,
    // and `no-hand-rolled-console-capture` takes the full capture and the spy left unclassified.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 4, path: 'src/sentinel.unit.test.ts', reported: true, symbol: 'ExitError' }],
      [{ line: 1, path: 'src/non-throwing.unit.test.ts', reported: true }],
      [
        { line: 1, path: 'src/throwing.unit.test.ts', reported: true },
        { line: 1, path: 'src/unreadable.unit.test.ts', reported: true },
      ],
      [{ line: 1, path: 'src/lossy.unit.test.ts', reported: true }],
      [
        { line: 1, path: 'src/capture.unit.test.ts', reported: true },
        { line: 1, path: 'src/spy-only.unit.test.ts', reported: true },
      ],
      [{ line: 1, path: 'src/silence.unit.test.ts', reported: true }],
      [{ line: 2, path: 'src/read.unit.test.ts', reported: true }],
      [{ line: 3, path: 'src/dispose.unit.test.ts', reported: true }],
    ]);
  });

  it('spans all ten sites in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 8 }, () => ({ adoptedCount: 0, findingCount: 10 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/exit.unit.test.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts a spy for which the package has no advice', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.unit.test.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  // The departure that the source-oriented kits invert. The test file beside it keeps the check running, so a
  // narrowed filter reports the silence here rather than leaving the check skipped.
  it('leaves a source that is no test alone', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/config.ts': SILENCE,
      'src/exit.unit.test.ts': ADOPTER,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck(await findCheck('no-hand-rolled-console-silence'))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  // The own-implementation exemption reaches a declaration exported under an adopted name, and this kit sweeps
  // no file that could hold one: The package declares `silenceConsole` in `src/3-candidate/`, which `isTestFile`
  // never matches. So the repository publishing the utility is reported like any other consumer, which is why
  // its own suite shows findings.
  it('reports a silence in the publishing repository, which declares the utility elsewhere', async () => {
    using tree = createTrackedRepo({ 'package.json': PUBLISHER_MANIFEST, 'src/silence.unit.test.ts': SILENCE });
    using _cwd = pointCwdAt(tree.dir);

    expect(listReportedFindings(await runCheck(await findCheck('no-hand-rolled-console-silence')))).toStrictEqual([
      { line: 1, path: 'src/silence.unit.test.ts', reported: true },
    ]);
  });

  it('skips every check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.ts': SILENCE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe('the project holds no test files');
  });
});

// region | Helpers

/** Finds a check by its id, for the assertions that turn on which of the eight checks reported. */
async function findCheck(id: string): Promise<RdyCheck | undefined> {
  return (await loadChecks()).find((check) => check.id === id);
}

/**
 * Loads a fresh kit and lists its adoption checks, which the flat checklist holds in declaration order.
 *
 * A kit holds its project sweep on its own closure, so one import would give every test here the first
 * fixture repo's findings. Resetting the registry leaves each test with a kit that has swept nothing yet.
 */
async function loadChecks(): Promise<RdyCheck[]> {
  vi.resetModules();
  const kit = (await import('../../../.readyup/kits/default.ts')).default;

  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return [];
  return checklist.checks;
}

// endregion | Helpers
