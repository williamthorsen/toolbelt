import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { collectReachableModuleSet } from '../test-utils/collectReachableModuleSet.ts';
import { isRecord } from '../test-utils/isRecord.ts';
import { listExportedTierDirectories } from '../test-utils/listExportedTierDirectories.ts';
import { listStringLeaves } from '../test-utils/listStringLeaves.ts';
import { readManifest } from '../test-utils/readManifest.ts';
import { resolveBinSourceModule } from '../test-utils/resolveBinSourceModule.ts';

// A specifier naming a package rather than a sibling file. A bare side-effect import contains no `from`, so a
// dependency reached only that way would be reported as unreachable; no workspace writes one.
const PACKAGE_SPECIFIER_PATTERN = /from\s+'([^.'][^']*)'/g;

describe('Runtime dependencies', () => {
  it('every declared dependency is reachable from an export subpath or a declared bin', () => {
    const { dependencyCount, unreachableDependencies } = auditDependencyReachability(findMonorepoRoot());

    expect(unreachableDependencies).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no unreachable dependencies either.
    expect(dependencyCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every workspace's `dependencies` against what its export subpaths and declared bins reach, reporting each
 * dependency imported by neither. Such a dependency installs for every consumer while nothing that they can import
 * or run needs it. A bin counts because its dependency installs for every consumer that runs it.
 *
 * `devDependencies` stay out: They do not publish, and `packages/adoption` is installed for its consumers through
 * that field. A type-only import counts, since a consumer typechecking against the shipped declarations needs it.
 */
function auditDependencyReachability(monorepoRoot: string): {
  dependencyCount: number;
  unreachableDependencies: string[];
} {
  const unreachableDependencies: string[] = [];
  let dependencyCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const manifest = readManifest(packageDirectory);
    // A private workspace installs for nobody, and it is the one shape that exports source rather than a tier
    // index, which the walk below reaches through no entry point.
    if (manifest['private'] === true) continue;

    const dependencies = listDependencies(manifest);
    if (dependencies.length === 0) continue;

    const workspace = path.relative(monorepoRoot, packageDirectory);
    const specifiers = collectPackageSpecifierSet(packageDirectory, manifest);

    for (const dependency of dependencies) {
      dependencyCount += 1;

      if (!isImported(dependency, specifiers)) {
        unreachableDependencies.push(`${workspace}: ${dependency} is reachable from no export subpath or bin`);
      }
    }
  }

  return {
    dependencyCount,
    unreachableDependencies: unreachableDependencies.toSorted((a, b) => a.localeCompare(b)),
  };
}

/** Collects every package specifier written by the modules that a package's export subpaths and bins reach. */
function collectPackageSpecifierSet(packageDirectory: string, manifest: Record<string, unknown>): Set<string> {
  const specifiers = new Set<string>();

  for (const entryPath of listEntryPaths(packageDirectory, manifest)) {
    const reached = collectReachableModuleSet(entryPath);

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

/** Lists the runtime dependencies declared by a manifest. */
function listDependencies(manifest: Record<string, unknown>): string[] {
  const dependencies = manifest['dependencies'];

  return isRecord(dependencies) ? Object.keys(dependencies).toSorted((a, b) => a.localeCompare(b)) : [];
}

/**
 * Lists the modules from which a package's walk starts: each exported tier's index and each declared bin's source
 * module. A bin that resolves to no source module adds none, since `bin-target-resolution` reports it.
 */
function listEntryPaths(packageDirectory: string, manifest: Record<string, unknown>): string[] {
  const tierEntries = listExportedTierDirectories(packageDirectory).map((directory) =>
    path.join(directory, 'index.ts'),
  );
  const binEntries = listStringLeaves(manifest['bin']).flatMap((target) => {
    const resolution = resolveBinSourceModule(packageDirectory, target);
    return 'sourcePath' in resolution ? [resolution.sourcePath] : [];
  });

  return [...tierEntries, ...binEntries];
}

// endregion | Helpers
