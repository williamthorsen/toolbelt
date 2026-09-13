import { createTrackedRepo, pointCwdAt, runCheck, runSkip } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isFlatChecklist, type RdyCheck } from 'readyup';
import { describe, expect, it, vi } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const PUBLISHER_MANIFEST = JSON.stringify({ name: '@williamthorsen/toolbelt.packaging', version: '1.0.0' });

const MANIFEST_SEARCH = [
  'export function resolvePackageRoot() {',
  '  let dir = path.dirname(fileURLToPath(import.meta.url));',
  "  while (!fs.existsSync(path.join(dir, 'package.json'))) {",
  '    const parent = path.dirname(dir);',
  "    if (parent === dir) throw new Error('no package.json found');",
  '    dir = parent;',
  '  }',
  '  return dir;',
  '}',
  '',
].join('\n');
// A walk that `toolbelt.filesystem` claims, which this kit declines rather than reporting under advice that does
// not fit it.
const MARKER_SEARCH = [
  'export function findRepositoryRoot(startDir) {',
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
// The package's own findPackageRoot, written with the walk that its check reports.
const OWN_FIND_PACKAGE_ROOT = [
  'export function findPackageRoot(fromUrl) {',
  '  let dir = path.dirname(fileURLToPath(fromUrl));',
  "  while (!fs.existsSync(path.join(dir, 'package.json'))) {",
  '    const parent = path.dirname(dir);',
  "    if (parent === dir) throw new Error('no package.json found');",
  '    dir = parent;',
  '  }',
  '  return dir;',
  '}',
  '',
].join('\n');
// Prose about the walk, and a read of a manifest that searches no chain.
const UNCLAIMED = [
  "// Ascends by dir = path.dirname(dir) until path.join(dir, 'package.json') exists.",
  "export const readManifest = (root) => JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));",
  '',
].join('\n');
const ADOPTER = [
  "import { findPackageRoot } from '@williamthorsen/toolbelt.packaging/candidate';",
  'export const packageRoot = () => findPackageRoot(import.meta.url);',
  '',
].join('\n');

describe('The packaging adoption kit', () => {
  it('reports a manifest search, naming where it is, and counts it against a call into the package', async () => {
    using tree = createTrackedRepo({
      'package.json': MANIFEST,
      'src/adopter.ts': ADOPTER,
      'src/root.ts': MANIFEST_SEARCH,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 1,
      findings: [{ line: 3, path: 'src/root.ts', reported: true }],
    });
  });

  it('leaves a walk probing for a repository marker alone out of the report and out of the denominator', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/root.ts': MARKER_SEARCH });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('neither reports nor counts prose about the walk or a read of a manifest that searches no chain', async () => {
    using tree = createTrackedRepo({ 'package.json': MANIFEST, 'src/manifest.ts': UNCLAIMED });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 0, findings: [] });
  });

  it('exempts the package’s own findPackageRoot, and reports a hand-roll beside it', async () => {
    using tree = createTrackedRepo({
      'package.json': PUBLISHER_MANIFEST,
      'src/findPackageRoot.ts': OWN_FIND_PACKAGE_ROOT,
      'src/other.ts': MANIFEST_SEARCH,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({
      adoptedCount: 0,
      findings: [{ line: 3, path: 'src/other.ts', reported: true }],
    });
  });

  it('leaves a test file and a bootstrap wrapper alone', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': MANIFEST_SEARCH,
      'package.json': MANIFEST,
      'src/__tests__/root.unit.test.ts': MANIFEST_SEARCH,
      'src/adopter.ts': ADOPTER,
    });
    using _cwd = pointCwdAt(tree.dir);

    await expect(runCheck((await loadChecks())[0])).resolves.toStrictEqual({ adoptedCount: 1, findings: [] });
  });

  it('skips the check where the sweep matches no source', async () => {
    using tree = createTrackedRepo({
      'bin/run.js': MANIFEST_SEARCH,
      'package.json': MANIFEST,
      'src/__tests__/root.unit.test.ts': MANIFEST_SEARCH,
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
