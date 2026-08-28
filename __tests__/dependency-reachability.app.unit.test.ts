import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { collectReachableModuleSet } from '../test-utils/collectReachableModuleSet.ts';
import { isRecord } from '../test-utils/isRecord.ts';
import { listExportedTierDirectories } from '../test-utils/listExportedTierDirectories.ts';
import { readManifest } from '../test-utils/readManifest.ts';

// A specifier naming a package rather than a sibling file. A bare side-effect import carries no `from`, so a
// dependency reached only that way would read as unreachable; no workspace writes one.
const PACKAGE_SPECIFIER_PATTERN = /from\s+'([^.'][^']*)'/g;

describe('Runtime dependencies', () => {
  it('every declared dependency is reachable from an export subpath', () => {
    const { dependencyCount, unreachableDependencies } = auditDependencyReachability(findMonorepoRoot());

    expect(unreachableDependencies).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no unreachable dependencies either.
    expect(dependencyCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every workspace's `dependencies` against what its export subpaths reach, reporting each dependency no
 * exported module imports. Such a dependency installs for every consumer while nothing they can import needs it.
 *
 * `devDependencies` stay out: they do not publish, and `packages/adoption` reaches its consumers through that
 * field. A type-only import counts, since a consumer typechecking against the shipped declarations needs it.
 */
function auditDependencyReachability(monorepoRoot: string): {
  dependencyCount: number;
  unreachableDependencies: string[];
} {
  const unreachableDependencies: string[] = [];
  let dependencyCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const dependencies = listDependencies(packageDirectory);
    if (dependencies.length === 0) continue;

    const workspace = path.relative(monorepoRoot, packageDirectory);
    const specifiers = collectPackageSpecifierSet(packageDirectory);

    for (const dependency of dependencies) {
      dependencyCount += 1;

      if (!isImported(dependency, specifiers)) {
        unreachableDependencies.push(`${workspace}: ${dependency} is reachable from no export subpath`);
      }
    }
  }

  return {
    dependencyCount,
    unreachableDependencies: unreachableDependencies.toSorted((a, b) => a.localeCompare(b)),
  };
}

/** Collects every package specifier written by the modules a package's export subpaths reach. */
function collectPackageSpecifierSet(packageDirectory: string): Set<string> {
  const specifiers = new Set<string>();

  for (const tierDirectory of listExportedTierDirectories(packageDirectory)) {
    const reached = collectReachableModuleSet(path.join(tierDirectory, 'index.ts'));

    for (const filePath of reached) {
      const contents = fs.readFileSync(filePath, 'utf8');

      for (const [, specifier] of contents.matchAll(PACKAGE_SPECIFIER_PATTERN)) {
        if (specifier !== undefined) specifiers.add(specifier);
      }
    }
  }

  return specifiers;
}

/** Reports whether a specifier names the package or one of its subpaths. */
function isImported(dependency: string, specifiers: ReadonlySet<string>): boolean {
  return specifiers.values().some((specifier) => specifier === dependency || specifier.startsWith(`${dependency}/`));
}

/** Lists the runtime dependencies a workspace declares. */
function listDependencies(packageDirectory: string): string[] {
  const dependencies = readManifest(packageDirectory)['dependencies'];

  return isRecord(dependencies) ? Object.keys(dependencies).toSorted((a, b) => a.localeCompare(b)) : [];
}

// endregion | Helpers
