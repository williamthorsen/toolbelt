import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { type CheckOutcome, isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it } from 'vitest';

import { type AdoptionKitSpec, type AdoptionSite, defineAdoptionKit } from '../defineAdoptionKit.ts';
import { createTrackedRepo } from '../test-utils/createTrackedRepo.ts';

type Kind = 'clone' | 'inline';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLONE = 'function describeThing(x) {\n  return x.message;\n}\n';
const INLINE = "const label = thing.name;\nconst other = 'x';\n";
const ADOPTER = "import { doThing } from '@scope/pkg';\ndoThing();\ndoThing();\n";

/** Reports a `clone` on any line declaring a function and an `inline` on any line reading `.name`. */
function detect(text: string): Array<AdoptionSite<Kind>> {
  return text.split('\n').flatMap((content, index): Array<AdoptionSite<Kind>> => {
    if (content.startsWith('function ')) {
      return [{ kind: 'clone', line: index + 1, symbol: content.slice(9).split('(', 1)[0] ?? '' }];
    }
    return content.includes('.name') ? [{ kind: 'inline', line: index + 1 }] : [];
  });
}

function buildSpec(overrides: Partial<AdoptionKitSpec<Kind>> = {}): AdoptionKitSpec<Kind> {
  return {
    checks: [
      { fix: 'delete it', kinds: ['clone'], name: 'clone check' },
      { fix: 'replace it', kinds: ['inline'], name: 'inline check' },
    ],
    description: 'Adoption checks for a project consuming @scope/pkg',
    detect,
    exportNames: ['doThing'],
    noSourcesReason: 'the project holds no sources',
    packageName: '@scope/pkg',
    pathFilter: (path) => path.endsWith('.ts'),
    ...overrides,
  };
}

describe(defineAdoptionKit, () => {
  it('reports each finding of a check’s kinds, naming its path and line', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE, 'src/b.ts': INLINE });
    using _cwd = pointCwdAt(tree.dir);

    const [cloneCheck, inlineCheck] = listChecks(buildSpec());

    await expect(runCheck(cloneCheck)).resolves.toMatchObject({ detail: 'describeThing (src/a.ts:1)', ok: false });
    await expect(runCheck(inlineCheck)).resolves.toMatchObject({ detail: 'src/b.ts:1', ok: false });
  });

  it('spans every finding in the denominator, so a run’s checks share one fraction', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE, 'src/b.ts': INLINE });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all(listChecks(buildSpec()).map((check) => runCheck(check)));

    expect(outcomes.map((outcome) => outcome.progress)).toStrictEqual([
      { count: 2, passedCount: 0, type: 'fraction' },
      { count: 2, passedCount: 0, type: 'fraction' },
    ]);
  });

  it('counts calls into the package as adopted, and only where the source imports it', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/adopter.ts': ADOPTER,
      'src/clone.ts': 'function doThing(x) {\n  return x;\n}\ndoThing();\n',
    });
    using _cwd = pointCwdAt(tree.dir);

    const [cloneCheck] = listChecks(buildSpec());

    expect((await runCheck(cloneCheck)).progress).toStrictEqual({ count: 3, passedCount: 2, type: 'fraction' });
  });

  it('passes a check whose kinds the project holds none of', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/b.ts': INLINE });
    using _cwd = pointCwdAt(tree.dir);

    const [cloneCheck] = listChecks(buildSpec());

    await expect(runCheck(cloneCheck)).resolves.toStrictEqual({
      ok: true,
      progress: { count: 1, passedCount: 0, type: 'fraction' },
    });
  });

  it('reads only the paths the filter matches', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE, 'src/skipped.js': CLONE });
    using _cwd = pointCwdAt(tree.dir);

    const [cloneCheck] = listChecks(buildSpec());

    expect((await runCheck(cloneCheck)).detail).toBe('describeThing (src/a.ts:1)');
  });

  it('skips every check where the project publishes the package under test', async () => {
    using tree = createTrackedRepo({ 'package.json': JSON.stringify({ name: '@scope/pkg', version: '1.0.0' }) });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip(listChecks(buildSpec())[0])).resolves.toBe(
      'this project publishes the package these checks are for',
    );
  });

  it('skips every check where the project is not a git working tree', async () => {
    using tree = createTempTree({ 'package.json': MANIFEST, 'src/a.ts': CLONE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip(listChecks(buildSpec())[0])).resolves.toBe(
      'the project is not a git working tree, and these checks read the files git tracks',
    );
  });

  it('skips with the spec’s own reason where the filter matches nothing', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'README.md': '# fixture\n' });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip(listChecks(buildSpec())[0])).resolves.toBe('the project holds no sources');
  });

  it('runs every check where the project holds matching sources it does not publish', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip(listChecks(buildSpec())[0])).resolves.toBe(false);
  });
});

// region | Helpers

/** Lists the assembled kit's adoption checks, which the flat checklist holds in declaration order. */
function listChecks(spec: AdoptionKitSpec<Kind>): RdyCheck[] {
  const [checklist] = defineAdoptionKit(spec).checklists;
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
