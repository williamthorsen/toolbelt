import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { collectReachableModuleSet } from '../test-utils/collectReachableModuleSet.ts';
import { listExportedTierDirectories } from '../test-utils/listExportedTierDirectories.ts';
import { listSourceFiles } from '../test-utils/listSourceFiles.ts';
import { SCAFFOLDING_DIRS } from '../test-utils/scaffolding-dirs.ts';

describe('Maturity-tier modules', () => {
  it('every module in an exported tier is reachable from a tier index', () => {
    const { moduleCount, unreachableModules } = auditTierModules(findMonorepoRoot());

    expect(unreachableModules).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no unreachable modules either.
    expect(moduleCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every module in a package's exported maturity tiers, reporting those no tier index reaches. Such a
 * module compiles into `dist` while no export subpath exposes it, so nothing installed can import it.
 *
 * Reachability is taken across all of a package's exported tiers at once: a module a neighbouring tier imports
 * is published through that tier's index, whether or not its own index names it.
 */
function auditTierModules(monorepoRoot: string): { moduleCount: number; unreachableModules: string[] } {
  const unreachableModules: string[] = [];
  let moduleCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const tierDirectories = listExportedTierDirectories(packageDirectory);
    if (tierDirectories.length === 0) continue;

    const reached = new Set(
      tierDirectories.flatMap((tierDirectory) => [...collectReachableModuleSet(path.join(tierDirectory, 'index.ts'))]),
    );

    for (const tierDirectory of tierDirectories) {
      for (const filePath of listSourceFiles(tierDirectory, SCAFFOLDING_DIRS)) {
        moduleCount += 1;

        if (!reached.has(filePath)) {
          unreachableModules.push(path.relative(monorepoRoot, filePath));
        }
      }
    }
  }

  return { moduleCount, unreachableModules: unreachableModules.toSorted((a, b) => a.localeCompare(b)) };
}

// endregion | Helpers
