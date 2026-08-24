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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.numbers', version: '1.0.0' });
const CLAMP = 'export const bounded = Math.max(min, Math.min(max, value));\n';
// The package's own `clamp`, holding the idiom its check recommends replacing.
const OWN_CLAMP = 'export function clamp(value, bounds) {\n  return Math.max(min, Math.min(max, value));\n}\n';
const ROUND = 'export const rate = Math.round(value * 100) / 100;\n';
const RANDOM = 'export const roll = Math.floor(Math.random() * sides);\n';
// The `arrays` idiom and a legitimate scaling, neither of which this kit claims.
const UNCLAIMED = 'export const item = items[Math.floor(Math.random() * items.length)];\nexport const t = a * 100;\n';
const ADOPTER = "import { round } from '@williamthorsen/toolbelt.numbers/candidate';\nround(value, 2);\n";
const ALL_IDIOMS = { 'package.json': MANIFEST, 'src/bound.ts': CLAMP, 'src/rate.ts': ROUND, 'src/roll.ts': RANDOM };

describe('The numbers adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(ALL_IDIOMS);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 1, path: 'src/bound.ts', reported: true }],
      [{ line: 1, path: 'src/rate.ts', reported: true }],
      [{ line: 1, path: 'src/roll.ts', reported: true }],
    ]);
  });

  it('spans every idiom in the denominator, so the three checks share one fraction', async () => {
    using tree = createTrackedRepo(ALL_IDIOMS);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/rate.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[1])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  // A subscripted random integer is `toolbelt.arrays`' site. Claiming it would report one line twice across
  // the two kits; counting it would leave a fraction no check here could close.
  it('neither reports nor counts a site it hands off to another kit', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/pick.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[2])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own clamp, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/clamp.ts': OWN_CLAMP,
      'src/other.ts': CLAMP,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/other.ts', reported: true }],
    });
  });

  it('skips every check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/bound.unit.test.ts': CLAMP });
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
