import path from 'node:path';

import { type KitCheckReport, listKitCheckReports } from '@williamthorsen/toolbelt.adoption/test-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = [
  "import { findPackageRoot } from '@williamthorsen/toolbelt.packaging/candidate';",
  'export const packageRoot = () => findPackageRoot(import.meta.url);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

describe('The packaging adoption kit, run through rdy', () => {
  it('names the site and counts it in the denominator', () => {
    expect(runKit(buildSearch(''))).toStrictEqual([
      { count: 2, detail: 'src/root.ts:3', id: 'no-hand-rolled-manifest-search', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(buildSearch(' // rdy-ignore -- reviewed'))).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-manifest-search', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.packaging/no-hand-rolled-manifest-search`.
  it('drops a site covered by a qualified pragma', () => {
    expect(runKit(buildSearch(' // rdy-ignore no-hand-rolled-manifest-search -- reviewed'))).toStrictEqual([
      { count: 1, detail: undefined, id: 'no-hand-rolled-manifest-search', passedCount: 1 },
    ]);
  });

  // `toolbelt.filesystem`'s walk check is the one that a reader is likeliest to name by mistake.
  it('leaves a site standing where the pragma names another check', () => {
    expect(runKit(buildSearch(' // rdy-ignore no-hand-rolled-directory-walk -- reviewed'))).toStrictEqual([
      { count: 2, detail: 'src/root.ts:3', id: 'no-hand-rolled-manifest-search', passedCount: 1 },
    ]);
  });
});

// region | Helpers

/** Builds a hand-rolled manifest search whose loop line carries the given trailing pragma. */
function buildSearch(pragma: string): string {
  return [
    'export function resolvePackageRoot() {',
    '  let dir = path.dirname(fileURLToPath(import.meta.url));',
    `  while (!fs.existsSync(path.join(dir, 'package.json'))) {${pragma}`,
    '    const parent = path.dirname(dir);',
    "    if (parent === dir) throw new Error('no package.json found');",
    '    dir = parent;',
    '  }',
    '  return dir;',
    '}',
    '',
  ].join('\n');
}

/**
 * Runs the package's compiled kit over a fixture repo containing the given source, and reports what the check
 * named and counted.
 *
 * A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report reaches the
 * layer that acts on one.
 */
function runKit(source: string): KitCheckReport[] {
  return listKitCheckReports(PACKAGE_DIR, {
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/root.ts': source,
  });
}

// endregion | Helpers
