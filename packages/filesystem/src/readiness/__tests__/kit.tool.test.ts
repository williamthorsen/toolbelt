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
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.filesystem', version: '1.0.0' });

const ATOMIC_WRITE = [
  'export async function save(filePath, content) {',
  '  const tempPath = `${filePath}.tmp`;',
  '  await fs.writeFile(tempPath, content);',
  '  await fs.rename(tempPath, filePath);',
  '}',
  '',
].join('\n');
const CHAIN_WALK = [
  'export function listAncestors(startDir) {',
  '  const dirs = [];',
  '  let dir = startDir;',
  '  let previous;',
  '  while (dir !== previous) {',
  '    previous = dir;',
  '    dirs.push(dir);',
  '    dir = path.dirname(dir);',
  '  }',
  '  return dirs;',
  '}',
  '',
].join('\n');
const CHAIN_PROBE = [
  'export function findMarker(startDir) {',
  '  let dir = startDir;',
  '  while (true) {',
  "    if (fs.existsSync(path.join(dir, '.git'))) return dir;",
  '    const parent = path.dirname(dir);',
  '    if (parent === dir) return undefined;',
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');
// A walk that `toolbelt.packaging` claims, which this kit declines rather than reporting under a kind that no
// check here could close.
const MANIFEST_PROBE = [
  'export function findRoot(startDir) {',
  '  let dir = startDir;',
  '  while (true) {',
  "    if (fs.existsSync(path.join(dir, 'package.json'))) return dir;",
  '    const parent = path.dirname(dir);',
  '    if (parent === dir) return undefined;',
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');
// The package's own writeAtomic and listDirectoryChain, each written with the idiom that its check reports.
const OWN_WRITE_ATOMIC = [
  'export async function writeAtomic(filePath, content) {',
  '  await fs.writeFile(tempPath, content);',
  '  await fs.rename(tempPath, filePath);',
  '}',
  '',
].join('\n');
const OWN_DIRECTORY_CHAIN = [
  'export function listDirectoryChain(startDir) {',
  '  let dir = startDir;',
  '  let previous;',
  '  while (dir !== previous) {',
  '    previous = dir;',
  '    dir = path.dirname(dir);',
  '  }',
  '}',
  '',
].join('\n');
// Prose about both idioms, and reads that perform neither.
const UNCLAIMED = [
  '// Ascends by dir = path.dirname(dir) until it reaches the filesystem root.',
  'export const parentDir = path.dirname(filePath);',
  'export const backup = () => fs.renameSync(filePath, backupPath);',
  '',
].join('\n');
const ADOPTER = [
  "import { writeAtomic } from '@williamthorsen/toolbelt.filesystem/candidate';",
  'export const save = (filePath, content) => writeAtomic(filePath, content);',
  '',
].join('\n');
const EVERY_IDIOM = {
  'package.json': MANIFEST,
  'src/ancestors.ts': CHAIN_WALK,
  'src/marker.ts': CHAIN_PROBE,
  'src/save.ts': ATOMIC_WRITE,
};

describe('The filesystem adoption kit', () => {
  it('reports each idiom under its own check, naming where it is', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    // The write check names the function to change; a loop declares nothing, so the walk check names the location.
    expect(outcomes.map(listReportedFindings)).toStrictEqual([
      [{ line: 4, path: 'src/save.ts', reported: true, symbol: 'save' }],
      [
        { line: 5, path: 'src/ancestors.ts', reported: true },
        { line: 3, path: 'src/marker.ts', reported: true },
      ],
    ]);
  });

  it('spans all three sites in the denominator, so the checks share one fraction', async () => {
    using tree = createTrackedRepo(EVERY_IDIOM);
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.map(summarizeFraction)).toStrictEqual(
      Array.from({ length: 2 }, () => ({ adoptedCount: 0, findingCount: 3 })),
    );
  });

  it('counts a call into the package as adoption', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/save.ts': ADOPTER });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('leaves a walk that probes for a manifest out of the report and out of the denominator', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/root.ts': MANIFEST_PROBE });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[1])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('neither reports nor counts prose about an idiom or a call that performs neither', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/paths.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes).toStrictEqual(Array.from({ length: 2 }, () => ({ adoptedCount: 0, findings: [] })));
  });

  it('exempts the package’s own implementations, and reports a hand-roll beside them', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/listDirectoryChain.ts': OWN_DIRECTORY_CHAIN,
      'src/other.ts': ATOMIC_WRITE,
      'src/writeAtomic.ts': OWN_WRITE_ATOMIC,
    });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes.flatMap(listReportedFindings)).toStrictEqual([
      { line: 4, path: 'src/other.ts', reported: true, symbol: 'save' },
    ]);
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': CHAIN_PROBE,
      'package.json': MANIFEST,
      'src/__tests__/save.unit.test.ts': ATOMIC_WRITE,
      'src/save.ts': ADOPTER,
    });
    using _cwd = pointCwdAt(tree.dir);

    const outcomes = await Promise.all((await loadChecks()).map((check) => runCheck(check)));

    expect(outcomes).toStrictEqual(Array.from({ length: 2 }, () => ({ adoptedCount: 1, findings: [] })));
  });

  it('skips every check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': CHAIN_PROBE,
      'package.json': MANIFEST,
      'src/__tests__/save.unit.test.ts': ATOMIC_WRITE,
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
