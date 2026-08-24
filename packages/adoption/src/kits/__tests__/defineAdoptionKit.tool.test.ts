import { type FindingOutcome, isFlatChecklist, type OutcomeFinding, type RdyCheck } from 'readyup';
import { describe, expect, it } from 'vitest';

import { type AdoptionKitSpec, type AdoptionSite, defineAdoptionKit } from '../defineAdoptionKit.ts';
import { createTempDir } from '../test-utils/createTempDir.ts';
import { createTrackedRepo } from '../test-utils/createTrackedRepo.ts';
import { pointCwdAt } from '../test-utils/pointCwdAt.ts';

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
      { fix: 'delete it', id: 'no-clone', kinds: ['clone'], name: 'clone check' },
      { fix: 'replace it', id: 'no-inline', kinds: ['inline'], name: 'inline check' },
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

    expect(listReported(await runCheck(cloneCheck))).toStrictEqual([
      { line: 1, path: 'src/a.ts', reported: true, symbol: 'describeThing' },
    ]);
    expect(listReported(await runCheck(inlineCheck))).toStrictEqual([{ line: 1, path: 'src/b.ts', reported: true }]);
  });

  it('spans every finding in the denominator, so a run’s checks share one fraction', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE, 'src/b.ts': INLINE });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all(listChecks(buildSpec()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual([
      { adoptedCount: 0, findingCount: 2 },
      { adoptedCount: 0, findingCount: 2 },
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

    expect(summarizeFraction(await runCheck(cloneCheck))).toStrictEqual({ adoptedCount: 2, findingCount: 1 });
  });

  it('names no site where the project holds none of a check’s kinds, and counts the rest anyway', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/b.ts': INLINE });
    using _cwd = pointCwdAt(tree.dir);

    const [cloneCheck] = listChecks(buildSpec());

    await expect(runCheck(cloneCheck)).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/b.ts', reported: false }],
    });
  });

  it('reads only the paths the filter matches', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE, 'src/skipped.js': CLONE });
    using _cwd = pointCwdAt(tree.dir);

    const [cloneCheck] = listChecks(buildSpec());

    expect((await runCheck(cloneCheck)).findings).toStrictEqual([
      { line: 1, path: 'src/a.ts', reported: true, symbol: 'describeThing' },
    ]);
  });

  it('sweeps per kit, so one kit’s findings are not another’s', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/a.ts': CLONE, 'src/b.ts': INLINE });
    using _cwd = pointCwdAt(tree.dir);

    // Two live kits over one repo, each filtered to a different file. A cache shared across kits would serve
    // the first kit's sweep to the second.
    const cloneOnly = listChecks(buildSpec({ pathFilter: (path) => path.endsWith('a.ts') }));
    const inlineOnly = listChecks(buildSpec({ pathFilter: (path) => path.endsWith('b.ts') }));

    await expect(runCheck(cloneOnly[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/a.ts', reported: true, symbol: 'describeThing' }],
    });
    await expect(runCheck(inlineOnly[1])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 1, path: 'src/b.ts', reported: true }],
    });
  });

  // `skip` turns the check off before it runs, but `rdy run --diagnose` runs it anyway.
  it('names no site where the project is not a git working tree', async () => {
    using tree = createTempDir({ 'package.json': MANIFEST, 'src/a.ts': CLONE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck(listChecks(buildSpec())[0])).resolves.toStrictEqual({ findings: [] });
  });

  it('skips every check where the project publishes the package under test', async () => {
    using tree = createTrackedRepo({ 'package.json': JSON.stringify({ name: '@scope/pkg', version: '1.0.0' }) });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runSkip(listChecks(buildSpec())[0])).resolves.toBe(
      'this project publishes the package these checks are for',
    );
  });

  it('skips every check where the project is not a git working tree', async () => {
    using tree = createTempDir({ 'package.json': MANIFEST, 'src/a.ts': CLONE });
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

/**
 * Runs a check and returns the report it produced, which is the whole of what an adoption check declares: the
 * verdict, the detail, and the fraction are the runner's to derive, and are asserted where that derivation lives.
 */
async function runCheck(check: RdyCheck | undefined): Promise<FindingOutcome> {
  if (check === undefined) throw new Error('the kit holds no such check');
  const outcome = await check.check();
  if (typeof outcome === 'boolean' || !('findings' in outcome)) throw new Error('the check reported no findings');
  return outcome;
}

async function runSkip(check: RdyCheck | undefined): Promise<false | string> {
  if (check?.skip === undefined) throw new Error('the check carries no skip');
  return check.skip();
}

/** Lists the sites a check names, which are the ones the runner renders into its detail. */
function listReported(outcome: FindingOutcome): OutcomeFinding[] {
  return outcome.findings.filter((finding) => finding.reported);
}

/** Reduces a report to the two numbers the runner derives its fraction from. */
function summarizeFraction(outcome: FindingOutcome): { adoptedCount: number | undefined; findingCount: number } {
  return { adoptedCount: outcome.adoptedCount, findingCount: outcome.findings.length };
}

// endregion | Helpers
