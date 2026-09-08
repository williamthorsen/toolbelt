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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.guards', version: '1.0.0' });

const ASSERTION = [
  'export function check(condition, message) {',
  '  if (!condition) throw new Error(message);',
  '}',
  '',
].join('\n');
const NULLISH_ASSERTION = [
  'export function demand(value) {',
  '  if (value === null || value === undefined) throw new Error(MISSING);',
  '}',
  '',
].join('\n');
const PREDICATE = ['export function isText(value) {', "  return typeof value === 'string';", '}', ''].join('\n');
const NUMBER_GUARD = ['export function isNum(value) {', "  return typeof value === 'number';", '}', ''].join('\n');
// The package's own assert, holding the idiom that the first check reports.
const OWN_ASSERT = [
  'export function assert(condition, message) {',
  '  if (condition) return;',
  '  throw new Error(message);',
  '}',
  '',
].join('\n');
// Prose about a guard, and a source that tests nothing at all.
const UNCLAIMED = ['// Returns true where typeof value === “string”.', 'export const answer = 42;', ''].join('\n');
const ADOPTER = [
  "import { isString } from '@williamthorsen/toolbelt.guards';",
  'export const named = isString(value);',
  '',
].join('\n');
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/assertion.ts': ASSERTION,
  'src/nullish.ts': NULLISH_ASSERTION,
  'src/number.ts': NUMBER_GUARD,
  'src/predicate.ts': PREDICATE,
};

describe('The guards adoption kit', () => {
  it('reports each clone under its own check, naming the function to retire', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    // `no-assertion-clone` takes both assertion kinds, so its row holds two sites.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [
        { line: 1, path: 'src/assertion.ts', reported: true, symbol: 'check' },
        { line: 1, path: 'src/nullish.ts', reported: true, symbol: 'demand' },
      ],
      [{ line: 1, path: 'src/predicate.ts', reported: true, symbol: 'isText' }],
      [{ line: 1, path: 'src/number.ts', reported: true, symbol: 'isNum' }],
    ]);
  });

  it('spans all four sites in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 4 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/report.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts prose about a guard', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own assert, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/assert.ts': OWN_ASSERT,
      'src/other.ts': ASSERTION,
    });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.flatMap(listReportedFindings)).toStrictEqual([
      { line: 1, path: 'src/other.ts', reported: true, symbol: 'check' },
    ]);
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': ASSERTION,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': ASSERTION,
      'src/report.ts': ADOPTER,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('skips every check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': ASSERTION,
      'package.json': MANIFEST,
      'src/__tests__/config.unit.test.ts': ASSERTION,
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
