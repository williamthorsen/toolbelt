import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { RELATIVE_SPECIFIER_PATTERN } from '../test-utils/collectReachableModuleSet.ts';
import { listSourceFiles } from '../test-utils/listSourceFiles.ts';
import { NON_SOURCE_DIRS } from '../test-utils/non-source-dirs.ts';
import { resolveSpecifier } from '../test-utils/resolveSpecifier.ts';
import { isScaffolding } from '../test-utils/scaffolding-dirs.ts';

const PACKAGE_CONFIG_PATH = path.join('.config', 'nmr.config.ts');
const STRAWMAN_DIR = '0-strawman';
const STRAWMAN_IGNORE_PATTERN = "'**/0-strawman/**'";

describe('The strawman tier', () => {
  it('is dropped as a build entry point by every package holding one', () => {
    const { strawmanCount, unexcludedPackages } = auditStrawmanExclusions(findMonorepoRoot());

    expect(unexcludedPackages).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would find no package holding a strawman either.
    expect(strawmanCount).toBeGreaterThan(0);
  });

  it('is imported by no module outside it', () => {
    const { moduleCount, strawmanImporters } = auditStrawmanImporters(findMonorepoRoot());

    expect(strawmanImporters).toStrictEqual([]);
    expect(moduleCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every package holding a strawman tier, reporting those whose own `nmr` config does not drop it from the
 * build. A package that gains an incubation area without the exclusion publishes code no export subpath reaches.
 *
 * The config is read as text, so a pattern the file no longer spells out fails the audit whether it was removed
 * or replaced by the `readiness/` exclusion a package gains later.
 */
function auditStrawmanExclusions(monorepoRoot: string): { strawmanCount: number; unexcludedPackages: string[] } {
  const unexcludedPackages: string[] = [];
  let strawmanCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    if (!fs.existsSync(path.join(packageDirectory, 'src', STRAWMAN_DIR))) continue;

    strawmanCount += 1;

    const workspace = path.relative(monorepoRoot, packageDirectory);
    const configPath = path.join(packageDirectory, PACKAGE_CONFIG_PATH);

    if (!fs.existsSync(configPath)) {
      unexcludedPackages.push(`${workspace}: holds src/${STRAWMAN_DIR} and no ${PACKAGE_CONFIG_PATH}`);
    } else if (!fs.readFileSync(configPath, 'utf8').includes(STRAWMAN_IGNORE_PATTERN)) {
      unexcludedPackages.push(`${workspace}: ${PACKAGE_CONFIG_PATH} declares no ${STRAWMAN_IGNORE_PATTERN} pattern`);
    }
  }

  return { strawmanCount, unexcludedPackages: unexcludedPackages.toSorted((a, b) => a.localeCompare(b)) };
}

/**
 * Audits every module outside a strawman tier, reporting those importing into one. `extraIgnorePatterns` drops a
 * directory as a build entry point rather than from the emit, so an imported strawman module compiles anyway.
 */
function auditStrawmanImporters(monorepoRoot: string): { moduleCount: number; strawmanImporters: string[] } {
  const strawmanImporters: string[] = [];
  let moduleCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const sourceDirectory = path.join(packageDirectory, 'src');

    for (const importer of listSourceFiles(sourceDirectory, NON_SOURCE_DIRS)) {
      if (isStrawman(importer) || isScaffolding(importer)) continue;

      moduleCount += 1;

      const contents = fs.readFileSync(importer, 'utf8');

      for (const [, specifier] of contents.matchAll(RELATIVE_SPECIFIER_PATTERN)) {
        if (specifier === undefined) continue;

        const target = resolveSpecifier(path.dirname(importer), specifier);
        if (target !== undefined && isStrawman(target)) {
          strawmanImporters.push(`${path.relative(monorepoRoot, importer)} -> ${path.relative(monorepoRoot, target)}`);
        }
      }
    }
  }

  return { moduleCount, strawmanImporters: strawmanImporters.toSorted((a, b) => a.localeCompare(b)) };
}

/** Reports whether a path passes through a strawman tier. */
function isStrawman(filePath: string): boolean {
  return filePath.split(path.sep).includes(STRAWMAN_DIR);
}

// endregion | Helpers
