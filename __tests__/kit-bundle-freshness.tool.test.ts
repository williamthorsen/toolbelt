import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

const MANIFEST_PATH = path.join('.readyup', 'manifest.json');
const RDY_BIN_PATH = path.join('node_modules', '.bin', 'rdy');

describe('Compiled kit bundles', () => {
  it('every kit-bearing workspace holds a bundle current with its sources', () => {
    const { failures, workspaceCount } = auditKitBundles(findMonorepoRoot());

    expect(failures).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no failures either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Verifies every kit-bearing workspace's compiled bundle against the hashes its manifest records, reporting
 * those that fail. A bundle is a build artifact held in the tree, so nothing but this check notices when a
 * source it inlines moves on without it -- least of all a source in another workspace, which the kit's own
 * package.json never mentions.
 *
 * Workspaces are discovered rather than listed, so a package that gains a kit is covered on arrival.
 */
function auditKitBundles(monorepoRoot: string): { failures: string[]; workspaceCount: number } {
  const failures: string[] = [];
  const kitDirectories = getWorkspacePackageDirs(monorepoRoot).filter((directory) =>
    fs.existsSync(path.join(directory, MANIFEST_PATH)),
  );

  for (const directory of kitDirectories) {
    const workspace = path.relative(monorepoRoot, directory);
    const reason = verifyBundles(directory);
    if (reason !== undefined) failures.push(`${workspace}: ${reason}`);
  }

  return { failures: failures.toSorted((a, b) => a.localeCompare(b)), workspaceCount: kitDirectories.length };
}

/**
 * Reports why a workspace's bundles fail verification, or nothing where they pass.
 *
 * `--rebuild` recompiles and compares bytes, which catches a toolchain change the recorded hashes cannot: the
 * same sources emit a different bundle under a different esbuild.
 */
function verifyBundles(directory: string): string | undefined {
  const result = spawnSync(path.join(directory, RDY_BIN_PATH), ['verify', '--rebuild', '--json'], {
    cwd: directory,
    encoding: 'utf8',
  });

  if (result.error !== undefined) return `rdy could not be run (${result.error.message})`;
  if (result.status === 0) return undefined;

  return describeFailure(result.stdout) ?? `rdy verify exited ${String(result.status)}`;
}

/** Names each failing kit and the statuses behind its verdict, from the JSON report. */
function describeFailure(stdout: string): string | undefined {
  let report: unknown;
  try {
    report = JSON.parse(stdout);
  } catch {
    return undefined;
  }

  if (!isRecord(report) || !Array.isArray(report['kits'])) return undefined;

  return report['kits']
    .filter((kit) => isRecord(kit))
    .map((kit) => `${String(kit['name'])} (${String(kit['status'])}/${String(kit['inputsStatus'])})`)
    .join(', ');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

// endregion | Helpers
