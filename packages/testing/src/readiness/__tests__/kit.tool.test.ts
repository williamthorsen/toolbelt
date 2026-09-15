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

const ERROR_CAPTURE_CHECK = 'no-hand-rolled-error-capture';
const STDIO_CAPTURE_CHECK = 'no-hand-rolled-stdio-capture';
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
const STDIO_SPY = "vi.spyOn(process.stdout, 'write').mockImplementation(() => true);\n";
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
const STDIO_ADOPTER = [
  "import { captureStdio } from '@williamthorsen/toolbelt.testing/candidate';",
  'using stdio = captureStdio();',
  '',
].join('\n');

describe('The testing adoption kit', () => {
  it('reports an error capture, naming where it is', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.unit.test.ts': CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks()).get(ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' }],
    });
  });

  it('reports a stdio spy, naming where it is', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/output.unit.test.ts': STDIO_SPY });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks()).get(STDIO_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/output.unit.test.ts', reported: true }],
    });
  });

  // The inverse of the departure that `toolbelt.async` makes. The test file beside it keeps the check running,
  // so a widened filter reports the capture here rather than leaving the check skipped: outside a test, a
  // try/catch of this shape is error handling rather than an unadopted capture.
  it('leaves a source that is no test alone', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/adopter.unit.test.ts': ADOPTER,
      'src/config.ts': CAPTURE,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks()).get(ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('spans every site of both idioms in one denominator, naming each under its own check', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/first.unit.test.ts': CAPTURE,
      'src/output.unit.test.ts': STDIO_SPY,
      'src/second.unit.test.ts': CAPTURE,
    });
    using _cwd = pointCwdAt(tree.dir);

    const checks = await loadChecks();
    const errorCaptureOutcome = await runCheck(checks.get(ERROR_CAPTURE_CHECK));
    const stdioCaptureOutcome = await runCheck(checks.get(STDIO_CAPTURE_CHECK));

    expect(summarizeFraction(errorCaptureOutcome)).toStrictEqual({ adoptedCount: 0, findingCount: 3 });
    expect(summarizeFraction(stdioCaptureOutcome)).toStrictEqual({ adoptedCount: 0, findingCount: 3 });
    expect(listReportedFindings(stdioCaptureOutcome)).toStrictEqual([
      { line: 1, path: 'src/output.unit.test.ts', reported: true },
    ]);
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.unit.test.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks()).get(ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('counts a call to captureStdio as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/output.unit.test.ts': STDIO_ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks()).get(STDIO_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [],
    });
  });

  it('neither reports nor counts a try/catch that captures nothing', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.unit.test.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks()).get(ERROR_CAPTURE_CHECK))).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [],
    });
  });

  it('reports each capture a single test file holds', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.unit.test.ts': CAPTURE + CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    expect(listReportedFindings(await runCheck((await loadChecks()).get(ERROR_CAPTURE_CHECK)))).toStrictEqual([
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

    expect(listReportedFindings(await runCheck((await loadChecks()).get(ERROR_CAPTURE_CHECK)))).toStrictEqual([
      { line: 3, path: 'src/config.unit.test.ts', reported: true, symbol: 'caught' },
    ]);
  });

  it('skips the check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/config.ts': CAPTURE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks()).get(ERROR_CAPTURE_CHECK))).resolves.toBe(
      'the project holds no test files',
    );
  });
});

// region | Helpers

/**
 * Loads a fresh kit and maps each of its adoption checks by id.
 *
 * A kit holds its project sweep on its own closure, so one import would give every test here the first
 * fixture repo's findings. Resetting the registry leaves each test with a kit that has swept nothing yet.
 */
async function loadChecks(): Promise<Map<string, RdyCheck>> {
  vi.resetModules();
  const kit = (await import('../../../.readyup/kits/default.ts')).default;

  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return new Map();
  return new Map(checklist.checks.map((check) => [check.id ?? check.name, check]));
}

// endregion | Helpers
