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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.errors', version: '1.0.0' });

const ASSERT = ['if (!(value instanceof Error)) {', "  throw new TypeError('Expected an Error');", '}', ''].join('\n');
const CLONE = [
  'export function toMessage(error) {',
  '  if (error instanceof Error) return error.message;',
  '  return String(error);',
  '}',
  '',
].join('\n');
const COERCE = 'export const wrapped = value instanceof Error ? value : new Error(String(value));\n';
const DESCRIBE_INLINE = 'export const message = error instanceof Error ? error.message : String(error);\n';
const NARROW = "export const isErrno = error instanceof Error && 'code' in error;\n";
// The package's own describeError, holding the idiom that its first check reports.
const OWN_DESCRIBE_ERROR = [
  'export function describeError(error) {',
  '  if (error instanceof Error) return error.message;',
  '  return String(error);',
  '}',
  '',
].join('\n');
// Prose about the operator, and a source that never tests for an Error at all.
const UNCLAIMED = [
  '// Returns the message where the value is an instanceof Error.',
  'export const answer = 42;',
  '',
].join('\n');
const ADOPTER = [
  "import { describeError } from '@williamthorsen/toolbelt.errors';",
  'export const message = describeError(error);',
  '',
].join('\n');
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/assert.ts': ASSERT,
  'src/clone.ts': CLONE,
  'src/coerce.ts': COERCE,
  'src/describe.ts': DESCRIBE_INLINE,
  'src/narrow.ts': NARROW,
};

describe('The errors adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    // `no-instanceof-error` takes both the assert and the narrow kind, so its row holds two sites.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 2, path: 'src/clone.ts', reported: true, symbol: 'toMessage' }],
      [{ line: 1, path: 'src/describe.ts', reported: true }],
      [
        { line: 1, path: 'src/assert.ts', reported: true },
        { line: 1, path: 'src/narrow.ts', reported: true },
      ],
      [{ line: 1, path: 'src/coerce.ts', reported: true }],
    ]);
  });

  it('spans all five sites in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 4 }, () => ({ adoptedCount: 0, findingCount: 5 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/report.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts prose about the operator', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own describeError, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/describeError.ts': OWN_DESCRIBE_ERROR,
      'src/other.ts': DESCRIBE_INLINE,
    });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.flatMap(listReportedFindings)).toStrictEqual([{ line: 1, path: 'src/other.ts', reported: true }]);
  });

  // The departure that `toolbelt.async` and `toolbelt.testing` invert. The source beside them keeps the check
  // running, so a widened filter reports these rather than leaving the check skipped: A test constructs error
  // shapes deliberately, and a bootstrap wrapper's hand-rolled handling survives an incomplete install.
  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': DESCRIBE_INLINE,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': DESCRIBE_INLINE,
      'src/report.ts': ADOPTER,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('skips every check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': DESCRIBE_INLINE,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': DESCRIBE_INLINE,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe(
      'the project holds no JavaScript or TypeScript sources outside the exempt paths',
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
