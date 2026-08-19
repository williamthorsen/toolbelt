import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { isRecord } from '../test-utils/isRecord.ts';
import { listSourceFiles } from '../test-utils/listSourceFiles.ts';
import { readManifest } from '../test-utils/readManifest.ts';

/** Fields that install the runner for a consumer. A `devDependencies` entry does not, so it exempts nothing. */
const DEPENDENCY_FIELDS = ['dependencies', 'peerDependencies'] as const;
const EXCLUDED_DIRS = new Set(['__tests__', 'dist', 'node_modules']);
const RUNNER_PACKAGE = 'vitest';
const RUNNER_IMPORT_PATTERN = /(?:from|import)\s*\(?\s*['"]vitest(?:\/[^'"]*)?['"]/u;

describe('Runner-agnostic workspaces', () => {
  it('a workspace declaring no Vitest dependency imports no Vitest API', () => {
    const { fileCount, importers } = auditRunnerImports(findMonorepoRoot());

    expect(importers).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no importers either.
    expect(fileCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every workspace that declares no Vitest dependency, reporting source modules importing the runner
 * anyway. Such a module belongs in the `vitest` workspace, which carries the peer dependency that makes the
 * import resolvable for a consumer.
 */
function auditRunnerImports(monorepoRoot: string): { fileCount: number; importers: string[] } {
  const importers: string[] = [];
  let fileCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    if (declaresRunnerDependency(packageDirectory)) continue;

    const sourceFiles = listSourceFiles(path.join(packageDirectory, 'src'), EXCLUDED_DIRS);

    for (const filePath of sourceFiles) {
      fileCount += 1;

      if (RUNNER_IMPORT_PATTERN.test(fs.readFileSync(filePath, 'utf8'))) {
        importers.push(path.relative(monorepoRoot, filePath));
      }
    }
  }

  return { fileCount, importers: importers.toSorted((a, b) => a.localeCompare(b)) };
}

/** Reports whether a package's manifest declares Vitest under a field that installs it for a consumer. */
function declaresRunnerDependency(packageDirectory: string): boolean {
  const manifest = readManifest(packageDirectory);

  return DEPENDENCY_FIELDS.some((field) => {
    const declared = manifest[field];
    return isRecord(declared) && Object.hasOwn(declared, RUNNER_PACKAGE);
  });
}

// endregion | Helpers
