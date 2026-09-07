import {
  createTrackedRepo,
  listReportedFindings,
  runCheck,
  runSkip,
  summarizeFraction,
} from '@williamthorsen/toolbelt.adoption/test-utils';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

import { pointCwdAt } from '../../3-candidate/pointCwdAt.ts';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CAPTURE = [
  'let caught: unknown;',
  '',
  'try {',
  '  parseConfig(text);',
  '} catch (error) {',
  '  caught = error;',
  '}',
  '',
].join('\n');
// A catch that reports rather than assigns, one that rethrows, and a try block running more than one call.
const UNCLAIMED = [
  'try {',
  '  parseConfig(text);',
  '} catch (error) {',
  '  report(error);',
  '}',
  'try {',
  '  parseConfig(text);',
  '} catch (error) {',
  '  throw error;',
  '}',
  'let caught: unknown;',
  'try {',
  '  setup();',
  '  parseConfig(text);',
  '} catch (error) {',
  '  caught = error;',
  '}',
  '',
].join('\n');
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.testing', version: '1.0.0' });
const ADOPTER = [
  "import { captureError } from '@williamthorsen/toolbelt.testing';",
  'const caught = await captureError(() => parseConfig(text));',
  '',
].join('\n');

describe('The testing adoption kit', () => {
  it('reports the idiom, naming where it is', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.unit.test.ts': CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' }],
    });
  });

  // The inverse of the departure that `toolbelt.async` makes. This case exists to fail on widening the path
  // filter: outside a test, a try/catch of this shape is error handling rather than an unadopted capture.
  it('leaves a source that is no test alone', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.ts': CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe('the project holds no test files');
  });

  it('spans every site in the denominator', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/first.unit.test.ts': CAPTURE,
      'src/second.unit.test.ts': CAPTURE,
    });
    using _cwd = pointCwdAt(tree.dir);

    expect(summarizeFraction(await runCheck((await loadChecks())[0]))).toStrictEqual({
      adoptedCount: 0,
      findingCount: 2,
    });
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.unit.test.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts a try/catch that captures nothing', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.unit.test.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('reports each capture a single test file holds', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.unit.test.ts': CAPTURE + CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    expect(listReportedFindings(await runCheck((await loadChecks())[0]))).toStrictEqual([
      { line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
      { line: 10, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
    ]);
  });

  // The own-implementation exemption reaches a declaration exported under an adopted name, and this kit sweeps
  // no file that could hold one, the package declaring `captureError` outside its tests. So the repository
  // publishing the utility is reported like any other consumer, which is why its own suite shows findings.
  it('reports a capture in the publishing repository, which declares the utility elsewhere', async () => {
    using tree = createTrackedRepo({ 'package.json': PUBLISHER_MANIFEST, 'src/config.unit.test.ts': CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    expect(listReportedFindings(await runCheck((await loadChecks())[0]))).toStrictEqual([
      { line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
    ]);
  });

  it('skips the check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.ts': CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe('the project holds no test files');
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
