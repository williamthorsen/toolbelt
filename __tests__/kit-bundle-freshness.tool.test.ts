import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { listKitVerificationFailures } from '../test-utils/listKitVerificationFailures.ts';

const MANIFEST_PATH = path.join('.readyup', 'manifest.json');
const RDY_BIN_PATH = path.join('node_modules', '.bin', 'rdy');

describe('Compiled kit bundles', () => {
  it('every workspace with a kit contains a bundle current with its sources', () => {
    const { failures, workspaceCount } = auditKitBundles(findMonorepoRoot());

    expect(failures).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no failures either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Verifies the compiled bundle of every workspace with a kit against the hashes recorded by its manifest,
 * reporting those that fail. A bundle is a build artifact committed to the tree, so nothing but this check
 * notices when a source that it inlines changes after the bundle was compiled -- least of all a source in another
 * workspace, which the kit's own package.json never mentions.
 *
 * One recursive `rdy verify` covers every workspace. `--rebuild` recompiles and compares bytes, which catches a
 * toolchain change that the recorded hashes cannot: The same sources emit a different bundle under a different
 * esbuild. Because this check discovers workspaces rather than listing them, it covers a package as soon as the
 * package gains a kit.
 */
function auditKitBundles(monorepoRoot: string): { failures: string[]; workspaceCount: number } {
  const kitWorkspaces = getWorkspacePackageDirs(monorepoRoot)
    .filter((directory) => fs.existsSync(path.join(directory, MANIFEST_PATH)))
    .map((directory) => path.relative(monorepoRoot, directory));

  const result = spawnSync(path.join(monorepoRoot, RDY_BIN_PATH), ['verify', '--recursive', '--rebuild', '--json'], {
    cwd: monorepoRoot,
    encoding: 'utf8',
  });

  const failures =
    result.error === undefined
      ? listKitVerificationFailures(result, kitWorkspaces)
      : [`rdy could not be run (${result.error.message})`];

  return { failures, workspaceCount: kitWorkspaces.length };
}

// endregion | Helpers
