import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { iterateSourceFiles } from '../test-utils/iterateSourceFiles.ts';
import { listResolvedImports } from '../test-utils/listResolvedImports.ts';
import { NON_SOURCE_DIRS } from '../test-utils/non-source-dirs.ts';
import { isScaffolding } from '../test-utils/scaffolding-dirs.ts';
import { TIER_DIR_PATTERN } from '../test-utils/tier-dirs.ts';

describe('Barrel imports', () => {
  it('only a tier index imports through an `index.ts`', () => {
    const { barrelImports, fileCount } = auditBarrelImports(findMonorepoRoot());

    expect(barrelImports).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no barrel imports either.
    expect(fileCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every workspace's non-scaffolding source, reporting each relative import that resolves to an `index.ts`
 * from a module other than a tier index. A barrel is permitted only at a published entry point, and importing
 * one symbol through it loads every module that it re-exports.
 */
function auditBarrelImports(monorepoRoot: string): { barrelImports: string[]; fileCount: number } {
  const barrelImports: string[] = [];
  let fileCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const sourceFiles = iterateSourceFiles(path.join(packageDirectory, 'src'), NON_SOURCE_DIRS);

    for (const filePath of sourceFiles) {
      if (isScaffolding(filePath) || isTierIndex(filePath)) continue;
      fileCount += 1;

      for (const target of listResolvedImports(filePath)) {
        if (path.basename(target) === 'index.ts') {
          barrelImports.push(`${path.relative(monorepoRoot, filePath)} -> ${path.relative(monorepoRoot, target)}`);
        }
      }
    }
  }

  return { barrelImports: barrelImports.toSorted((a, b) => a.localeCompare(b)), fileCount };
}

/** Reports whether a file is the `index.ts` of a maturity tier directly under a workspace's `src/`. */
function isTierIndex(filePath: string): boolean {
  const tierDirectory = path.dirname(filePath);

  return (
    path.basename(filePath) === 'index.ts' &&
    TIER_DIR_PATTERN.test(path.basename(tierDirectory)) &&
    path.basename(path.dirname(tierDirectory)) === 'src'
  );
}

// endregion | Helpers
