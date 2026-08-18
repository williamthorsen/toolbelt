import { createTrackedRepo } from '@williamthorsen/toolbelt.adoption/test-utils';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { type CheckOutcome, isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLAMP = 'export const bounded = Math.max(min, Math.min(max, value));\n';
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

    expect(outcomes.map((outcome) => outcome.detail)).toStrictEqual([
      'src/bound.ts:1',
      'src/rate.ts:1',
      'src/roll.ts:1',
    ]);
  });

  it('spans every idiom in the denominator, so the three checks share one fraction', async () => {
    using tree = createTrackedRepo(ALL_IDIOMS);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map((outcome) => outcome.progress)).toStrictEqual(
      Array.from({ length: 3 }, () => ({ count: 3, passedCount: 0, type: 'fraction' })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/rate.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[1])).resolves.toStrictEqual({
      ok: true,
      progress: { count: 1, passedCount: 1, type: 'fraction' },
    });
  });

  // A subscripted random integer is `toolbelt.arrays`' site. Claiming it would report one line twice across
  // the two kits; counting it would leave a fraction no check here could close.
  it('neither reports nor counts a site it hands off to another kit', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/pick.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[2])).resolves.toStrictEqual({
      ok: true,
      progress: { count: 0, passedCount: 0, type: 'fraction' },
    });
  });

  it('skips every check where the project publishes the package', async () => {
    using tree = createTrackedRepo({
      'package.json': JSON.stringify({ name: '@williamthorsen/toolbelt.numbers', version: '1.0.0' }),
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip((await loadChecks())[0])).resolves.toBe(
      'this project publishes the package these checks are for',
    );
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

/** Runs a check, normalizing the boolean form readyup also accepts into an outcome. */
async function runCheck(check: RdyCheck | undefined): Promise<CheckOutcome> {
  if (check === undefined) throw new Error('the kit holds no such check');
  const outcome = await check.check();
  return typeof outcome === 'boolean' ? { ok: outcome } : outcome;
}

async function runSkip(check: RdyCheck | undefined): Promise<false | string> {
  if (check?.skip === undefined) throw new Error('the check carries no skip');
  return check.skip();
}

// endregion | Helpers
