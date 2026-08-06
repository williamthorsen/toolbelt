import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

const EXPORT_TARGET_PATTERN = /^\.\/dist\/esm\/(?<tier>[^/]+)\/index\.js$/;
const TIER_DIRECTORY_PATTERN = /^\d-[a-z]+$/;
// The strawman tier is unexported by design, so it is the one tier that needs no export subpath.
const UNEXPORTED_TIER = '0-strawman';

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

    for (const target of readExportTargets(packageDirectory)) {
      const tier = EXPORT_TARGET_PATTERN.exec(target)?.groups?.['tier'];
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
 * Reports whether a value is a plain object whose properties can be read by name.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Collects every string held by a value, descending through the nested condition objects an `exports` map uses.
 */
function listStringLeaves(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (!isRecord(value)) return [];

  return Object.values(value).flatMap((nested) => listStringLeaves(nested));
}

/**
 * Lists the maturity-tier directory names under a package's `src`.
 */
function listTierDirectories(packageDirectory: string): string[] {
  const sourceDirectory = path.join(packageDirectory, 'src');
  if (!fs.existsSync(sourceDirectory)) return [];

  return fs
    .readdirSync(sourceDirectory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && TIER_DIRECTORY_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .toSorted((a, b) => a.localeCompare(b));
}

/**
 * Reads the targets declared by a package's `exports` map.
 */
function readExportTargets(packageDirectory: string): string[] {
  const manifest: unknown = JSON.parse(fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'));

  return isRecord(manifest) ? listStringLeaves(manifest['exports']) : [];
}

// endregion | Helpers
