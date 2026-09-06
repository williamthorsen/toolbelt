import {
  createTrackedRepo,
  listReportedFindings,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.async', version: '1.0.0' });
const SLEEP = 'export const waited = new Promise((resolve) => setTimeout(resolve, 50));\n';
// The package's own `delay`, holding the idiom that its check recommends replacing.
const OWN_DELAY = 'export function delay(ms) {\n  return new Promise((resolve) => setTimeout(resolve, ms));\n}\n';
// A timer call carrying a value, a callback that settles nothing, and an executor doing more than the timer.
const UNCLAIMED = [
  'export const tagged = new Promise((resolve) => setTimeout(resolve, 50, token));',
  'export const stalled = new Promise((resolve) => setTimeout(done, 50));',
  'export const tracked = new Promise((resolve) => { report(); setTimeout(resolve, 50); });',
  '',
].join('\n');
const ADOPTER = "import { delay } from '@williamthorsen/toolbelt.async';\nawait delay(50);\n";

describe('The async adoption kit', () => {
  it('reports the idiom, naming where it is', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/wait.ts': SLEEP });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/wait.ts', reported: true }],
    });
  });

  // The departure from the five source-oriented kits, which exempt tests. Reverting the kit's path filter is
  // what this case exists to fail on.
  it('reports a sleep in a test, where the idiom mostly lives', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/wait.unit.test.ts': SLEEP });
    using _cwd = pointCwdAt(tree.dir);

    expect(listReportedFindings(await runCheck((await loadChecks())[0]))).toStrictEqual([
      { line: 1, path: 'src/wait.unit.test.ts', reported: true },
    ]);
  });

  it('spans every site in the denominator', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/first.ts': SLEEP, 'src/second.ts': SLEEP });
    using _cwd = pointCwdAt(tree.dir);

    expect(summarizeFraction(await runCheck((await loadChecks())[0]))).toStrictEqual({
      adoptedCount: 0,
      findingCount: 2,
    });
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/wait.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts a promise that is no bare sleep', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own delay, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/delay.ts': OWN_DELAY,
      'src/other.ts': SLEEP,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips the check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'bin/run.js': SLEEP, 'package.json': MANIFEST });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe(
      'the project holds no JavaScript or TypeScript sources outside its bootstrap wrappers',
    );
  });
});

// region | Helpers

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
