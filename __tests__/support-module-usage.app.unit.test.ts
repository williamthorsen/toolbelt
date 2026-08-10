import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

const EXCLUDED_DIRS = new Set(['dist', 'node_modules']);
const RELATIVE_SPECIFIER_PATTERN = /from\s+'(\.[^']*)'/g;
// The directories `nmr build` drops as entry points, which is what keeps a module inside one out of `dist`.
const SCAFFOLDING_DIRS = new Set(['__fixtures__', '__mocks__', '__tests__', 'test-utils']);
// The non-tier directories that ship: every module in one is its own build entry point.
const SUPPORT_DIRS = new Set(['internal', 'types']);

describe('Support modules', () => {
  it('every module under a support directory has an importer outside test scaffolding', () => {
    const { moduleCount, unusedModules } = auditSupportModules(findMonorepoRoot());

    expect(unusedModules).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no unused modules either.
    expect(moduleCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every module under a package's non-tier support directories, reporting those that nothing
 * outside test scaffolding imports. Such a module publishes as its own build entry point while serving
 * only tests, or nothing at all.
 */
function auditSupportModules(monorepoRoot: string): { moduleCount: number; unusedModules: string[] } {
  const sourceFiles = getWorkspacePackageDirs(monorepoRoot).flatMap((packageDirectory) => [
    ...listSourceFiles(path.join(packageDirectory, 'src')),
  ]);
  const importersByModule = indexImporters(sourceFiles);

  const unusedModules: string[] = [];
  let moduleCount = 0;

  for (const filePath of sourceFiles) {
    if (!isSupportModule(filePath) || isScaffolding(filePath)) continue;

    moduleCount += 1;

    const importers = importersByModule.get(filePath) ?? [];
    if (importers.every((importer) => isScaffolding(importer))) {
      unusedModules.push(path.relative(monorepoRoot, filePath));
    }
  }

  return { moduleCount, unusedModules: unusedModules.toSorted((a, b) => a.localeCompare(b)) };
}

/**
 * Maps each source file to the files importing it. Only relative specifiers are read: a package-name
 * specifier reaches another workspace's published entry point, which no support module is.
 */
function indexImporters(sourceFiles: string[]): Map<string, string[]> {
  const importersByModule = new Map<string, string[]>();

  for (const importer of sourceFiles) {
    const contents = fs.readFileSync(importer, 'utf8');

    for (const [, specifier] of contents.matchAll(RELATIVE_SPECIFIER_PATTERN)) {
      if (specifier === undefined) continue;

      const target = resolveSpecifier(path.dirname(importer), specifier);
      if (target === undefined) continue;

      importersByModule.set(target, [...(importersByModule.get(target) ?? []), importer]);
    }
  }

  return importersByModule;
}

/**
 * Reports whether a path passes through a directory holding test scaffolding.
 */
function isScaffolding(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => SCAFFOLDING_DIRS.has(segment));
}

/**
 * Reports whether a file sits under a package's non-tier support directory.
 */
function isSupportModule(filePath: string): boolean {
  const segments = filePath.split(path.sep);
  const srcIndex = segments.lastIndexOf('src');
  if (srcIndex === -1) return false;

  const supportSegment = segments[srcIndex + 1];

  return supportSegment !== undefined && SUPPORT_DIRS.has(supportSegment);
}

/**
 * Yields every TypeScript source file under the given directory, skipping build output. Test
 * scaffolding is walked rather than skipped, because a test is an importer like any other.
 */
function* listSourceFiles(rootDir: string): Generator<string> {
  if (!fs.existsSync(rootDir)) return;

  const pendingDirs = [rootDir];

  while (pendingDirs.length > 0) {
    const dir = pendingDirs.pop();
    if (dir === undefined) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) pendingDirs.push(entryPath);
      } else if (entry.name.endsWith('.ts')) {
        yield entryPath;
      }
    }
  }
}

/**
 * Resolves a relative specifier to the file it names. The repo writes the `.ts` extension explicitly,
 * but the extensionless forms are tried too, because an unresolved specifier drops a real importer and
 * would report the module it names as unused.
 */
function resolveSpecifier(importerDir: string, specifier: string): string | undefined {
  const base = path.resolve(importerDir, specifier);

  return [base, `${base}.ts`, path.join(base, 'index.ts')].find(
    (candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
  );
}

// endregion | Helpers
