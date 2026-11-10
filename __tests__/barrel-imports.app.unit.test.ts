import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { listSourceFiles } from '../test-utils/listSourceFiles.ts';
import { NON_SOURCE_DIRS } from '../test-utils/non-source-dirs.ts';
import { resolveSpecifier } from '../test-utils/resolveSpecifier.ts';
import { isScaffolding } from '../test-utils/scaffolding-dirs.ts';

/** Matches the relative specifier of a static `from` clause, a side-effect import, or a dynamic import. */
const RELATIVE_SPECIFIER_PATTERN = /\b(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]*)['"]/gu;
const TIER_DIRECTORY_PATTERN = /^\d-[a-z]+$/u;

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
    const sourceFiles = listSourceFiles(path.join(packageDirectory, 'src'), NON_SOURCE_DIRS);

    for (const filePath of sourceFiles) {
      if (isScaffolding(filePath) || isTierIndex(filePath)) continue;
      fileCount += 1;

      const specifierMatches = fs.readFileSync(filePath, 'utf8').matchAll(RELATIVE_SPECIFIER_PATTERN);

      for (const [, specifier] of specifierMatches) {
        if (specifier === undefined) continue;

        const target = resolveSpecifier(path.dirname(filePath), specifier);
        if (target !== undefined && path.basename(target) === 'index.ts') {
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
    TIER_DIRECTORY_PATTERN.test(path.basename(tierDirectory)) &&
    path.basename(path.dirname(tierDirectory)) === 'src'
  );
}

// endregion | Helpers
