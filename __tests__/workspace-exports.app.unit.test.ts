import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { createTempDir } from '../test-utils/createTempDir.ts';
import { hasSourceFile } from '../test-utils/hasSourceFile.ts';
import { listExportTargets } from '../test-utils/listExportTargets.ts';

const TIER_DIRECTORY_PATTERN = /^\d-[a-z]+$/;
// The strawman tier is unexported by design, so it is the one tier that needs no export subpath.
const UNEXPORTED_TIER = '0-strawman';

const PACKAGE_MANIFEST = JSON.stringify({
  exports: { './candidate': { import: './dist/esm/3-candidate/index.js' } },
  name: 'fixture',
});
const WORKSPACE_MANIFEST = "packages:\n  - 'packages/*'\n";

describe('Workspace exports', () => {
  it('every export target resolves to a maturity tier holding an index module', () => {
    const { danglingTargets, targetCount } = auditWorkspaceExports(findMonorepoRoot());

    expect(danglingTargets).toStrictEqual([]);
    expect(targetCount).toBeGreaterThan(0);
  });

  it('every maturity tier but the strawman is reachable through an export subpath', () => {
    const { tierCount, unexportedTiers } = auditWorkspaceExports(findMonorepoRoot());

    expect(unexportedTiers).toStrictEqual([]);
    expect(tierCount).toBeGreaterThan(0);
  });

  it('counts no tier for a directory holding no source file', () => {
    using tree = createTempDir({
      'packages/fixture/package.json': PACKAGE_MANIFEST,
      'packages/fixture/src/2-draft/': '',
      'packages/fixture/src/3-candidate/index.ts': '',
      'pnpm-workspace.yaml': WORKSPACE_MANIFEST,
    });

    const { tierCount, unexportedTiers } = auditWorkspaceExports(tree.dir);

    expect(unexportedTiers).toStrictEqual([]);
    expect(tierCount).toBe(1);
  });

  it('reports a populated tier that no export subpath reaches', () => {
    using tree = createTempDir({
      'packages/fixture/package.json': PACKAGE_MANIFEST,
      'packages/fixture/src/2-draft/index.ts': '',
      'packages/fixture/src/3-candidate/index.ts': '',
      'pnpm-workspace.yaml': WORKSPACE_MANIFEST,
    });

    const { tierCount, unexportedTiers } = auditWorkspaceExports(tree.dir);

    expect(unexportedTiers).toStrictEqual(['packages/fixture: src/2-draft has no export subpath']);
    expect(tierCount).toBe(2);
  });
});

// region | Helpers

/**
 * Audits every workspace's `exports` map against its maturity-tier directories, reporting export targets that
 * reach no tier index and tiers that no subpath exposes. The counts separate a clean audit from a broken walk,
 * which would report no defects either.
 */
function auditWorkspaceExports(monorepoRoot: string): {
  danglingTargets: string[];
  targetCount: number;
  tierCount: number;
  unexportedTiers: string[];
} {
  const danglingTargets: string[] = [];
  const unexportedTiers: string[] = [];
  let targetCount = 0;
  let tierCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const tiers = listTierDirectories(packageDirectory);
    // A workspace organized without maturity tiers exposes its source directly, so no correspondence exists to check.
    if (tiers.length === 0) continue;

    const workspace = path.relative(monorepoRoot, packageDirectory);
    const exportedTiers = new Set<string>();

    for (const { target, tier } of listExportTargets(packageDirectory)) {
      if (tier === undefined) {
        danglingTargets.push(`${workspace}: ${target} is not a maturity-tier entry point`);
        continue;
      }

      targetCount += 1;
      exportedTiers.add(tier);

      if (!fs.existsSync(path.join(packageDirectory, 'src', tier, 'index.ts'))) {
        danglingTargets.push(`${workspace}: ${target} has no src/${tier}/index.ts`);
      }
    }

    for (const tier of tiers) {
      if (tier === UNEXPORTED_TIER) continue;

      tierCount += 1;
      if (!exportedTiers.has(tier)) {
        unexportedTiers.push(`${workspace}: src/${tier} has no export subpath`);
      }
    }
  }

  return {
    danglingTargets: danglingTargets.toSorted((a, b) => a.localeCompare(b)),
    targetCount,
    tierCount,
    unexportedTiers: unexportedTiers.toSorted((a, b) => a.localeCompare(b)),
  };
}

/**
 * Lists the maturity-tier directory names under a package's `src`, taking a tier as present only where it holds a
 * TypeScript file.
 */
function listTierDirectories(packageDirectory: string): string[] {
  const sourceDirectory = path.join(packageDirectory, 'src');
  if (!fs.existsSync(sourceDirectory)) return [];

  return fs
    .readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && TIER_DIRECTORY_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .filter((tier) => hasSourceFile(path.join(sourceDirectory, tier)))
    .toSorted((a, b) => a.localeCompare(b));
}

// endregion | Helpers
