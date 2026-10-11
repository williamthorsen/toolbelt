import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { readManifest } from '../test-utils/readManifest.ts';

describe('Declared bins', () => {
  it('no workspace declares a bin', () => {
    const { binDeclarations, workspaceCount } = auditBinDeclarations(findMonorepoRoot());

    expect(binDeclarations).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no declarations either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Lists every workspace whose manifest declares `bin`. Toolbelt publishes exported functions only; a command
 * built on them belongs to a package of its own.
 */
function auditBinDeclarations(monorepoRoot: string): { binDeclarations: string[]; workspaceCount: number } {
  const packageDirectories = getWorkspacePackageDirs(monorepoRoot);
  const binDeclarations = packageDirectories
    .filter((packageDirectory) => readManifest(packageDirectory)['bin'] !== undefined)
    .map((packageDirectory) => path.relative(monorepoRoot, packageDirectory))
    .toSorted((a, b) => a.localeCompare(b));

  return { binDeclarations, workspaceCount: packageDirectories.length };
}

// endregion | Helpers
