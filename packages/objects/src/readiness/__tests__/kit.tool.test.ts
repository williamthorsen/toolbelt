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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.objects', version: '1.0.0' });
const OWN_PROPERTY = 'export const has = Object.prototype.hasOwnProperty.call(target, key);\n';
const RECORD = "export const ok = typeof value === 'object' && value !== null && !Array.isArray(value);\n";
const STRINGIFY = 'export const same = JSON.stringify(a) === JSON.stringify(b);\n';
// The package's own `isRecord`, holding the idiom its check recommends replacing.
const OWN_RECORD =
  "export function isRecord(value) {\n  return typeof value === 'object' && value !== null && !Array.isArray(value);\n}\n";
// A narrowing guard the record check declines, and a serialization the stringify check declines.
const UNCLAIMED =
  "export const isEnoent = typeof err === 'object' && err !== null && 'code' in err;\nexport const text = JSON.stringify(a) === '{}';\n";
const ADOPTER = "import { isRecord } from '@williamthorsen/toolbelt.objects';\nisRecord(value);\n";
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/guard.ts': RECORD,
  'src/has.ts': OWN_PROPERTY,
  'src/same.ts': STRINGIFY,
};

describe('The objects adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/has.ts', reported: true }],
      [{ line: 1, path: 'src/guard.ts', reported: true }],
      [{ line: 1, path: 'src/same.ts', reported: true }],
    ]);
  });

  it('spans all three idioms in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/guard.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('neither reports nor counts a guard that narrows further or a serialization it compares to a literal', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/probe.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes).toStrictEqual(Array.from({ length: 3 }, () => ({ adoptedCount: 0, findings: [] })));
  });

  it('exempts the package’s own isRecord, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/is-record.ts': OWN_RECORD,
      'src/other.ts': RECORD,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[1])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips every check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/guard.unit.test.ts': RECORD });
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
 * A kit holds its project sweep on its own closure, so one import would serve every test here the first
 * fixture repo's findings. Resetting the registry buys each test a kit that has swept nothing yet.
 */
async function loadChecks(): Promise<RdyCheck[]> {
  vi.resetModules();
  const kit = (await import('../../../.readyup/kits/default.ts')).default;

  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) return [];
  return checklist.checks;
}

// endregion | Helpers
