import { readFileSync, writeFileSync } from 'node:fs';

import { bumpVersion } from './bumpVersion.ts';
import type { ReleaseType } from './types.ts';

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

function isPackageJson(value: unknown): value is PackageJson {
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string';
}

/**
 * Bumps the version field in all specified package.json files.
 *
 * Reads each file, parses the JSON, bumps the `version` field, and writes
 * the result back with the original formatting (2-space indentation, trailing newline).
 *
 * @param packageFiles - Paths to package.json files to bump.
 * @param releaseType - The semver release type to apply.
 * @param dryRun - If true, logs the changes without writing to disk.
 * @returns The new version string after bumping.
 * @throws If any package.json does not contain a valid `version` field.
 */
export function bumpAllVersions(packageFiles: readonly string[], releaseType: ReleaseType, dryRun: boolean): string {
  if (packageFiles.length === 0) {
    throw new Error('No package files specified');
  }

  // Read the version from the first file to determine the current version
  const firstFile = packageFiles[0];
  if (firstFile === undefined) {
    throw new Error('No package files specified');
  }

  const firstContent = readFileSync(firstFile, 'utf8');
  const firstPkg: unknown = JSON.parse(firstContent);

  if (!isPackageJson(firstPkg)) {
    throw new Error(`No valid 'version' field found in ${firstFile}`);
  }

  const currentVersion = firstPkg.version;
  const newVersion = bumpVersion(currentVersion, releaseType);
  console.info(`Bumping version: ${currentVersion} -> ${newVersion} (${releaseType})`);

  for (const filePath of packageFiles) {
    if (dryRun) {
      console.info(`  [dry-run] Would bump ${filePath}`);
      continue;
    }

    const content = readFileSync(filePath, 'utf8');
    const pkg: unknown = JSON.parse(content);

    if (!isPackageJson(pkg)) {
      throw new Error(`No valid 'version' field found in ${filePath}`);
    }

    pkg.version = newVersion;
    writeFileSync(filePath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.info(`  Bumped ${filePath}`);
  }

  return newVersion;
}
