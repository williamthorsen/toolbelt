/* eslint n/no-process-exit: off */
/* eslint unicorn/no-process-exit: off */

/**
 * Synchronize root package.json version with the highest published package version
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { isObject } from '~/packages/objects/src/4-release/is-object.ts';

import rootPackageJson from '../package.json' with { type: 'json' };
import { getWorkspacePackages } from './helpers/workspace-discovery.ts';

type PackageJson = typeof rootPackageJson;

function isPackageJson(obj: unknown): obj is PackageJson {
  return isObject(obj) && typeof obj.version === 'string';
}

function readPackageJson(filepath: string): PackageJson {
  try {
    const content = readFileSync(filepath, 'utf8');
    const parsed: unknown = JSON.parse(content);
    if (!isPackageJson(parsed)) {
      throw new Error(`Invalid package.json format: ${filepath}`);
    }
    return parsed;
  } catch (error) {
    throw new Error(
      `Failed to read package.json: ${filepath}\\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function writePackageJson(filepath: string, pkg: PackageJson): void {
  try {
    const content = JSON.stringify(pkg, null, 2) + String.raw`\n`;
    writeFileSync(filepath, content);
  } catch (error) {
    throw new Error(
      `Failed to write package.json: ${filepath}\\n${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

function getPublishedPackageVersions(): Record<string, string> {
  const versions: Record<string, string> = {};
  const workspacePackages = getWorkspacePackages();

  // Convert workspace->packageName mapping to packageName->packageDir mapping
  for (const [workspaceDir, packageName] of Object.entries(workspacePackages)) {
    const packageJsonPath = join('packages', workspaceDir, 'package.json');

    try {
      const pkg = readPackageJson(packageJsonPath);
      versions[packageName] = pkg.version;
      console.info(`Found ${packageName}@${pkg.version}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Could not read version for ${packageName}: ${errorMessage}`);
    }
  }

  return versions;
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || 0;
    const bPart = bParts[i] || 0;

    if (aPart !== bPart) {
      return aPart - bPart;
    }
  }

  return 0;
}

function getHighestVersion(versions: Record<string, string>): { version: string; packageName: string } | undefined {
  const entries = Object.entries(versions);

  if (entries.length === 0) {
    return undefined;
  }

  const firstEntry = entries[0];
  if (!firstEntry) {
    return undefined;
  }

  let highest = firstEntry;

  for (let i = 1; i < entries.length; i++) {
    const entry = entries[i];
    if (!entry) continue;
    const [packageName, version] = entry;
    if (compareVersions(version, highest[1]) > 0) {
      highest = [packageName, version];
    }
  }

  return {
    packageName: highest[0],
    version: highest[1],
  };
}

function syncRootVersion(): void {
  console.info('Synchronizing root package version...');

  // Get published package versions
  const publishedVersions = getPublishedPackageVersions();

  if (Object.keys(publishedVersions).length === 0) {
    console.info('No published packages found, skipping synchronization');
    return;
  }

  // Find highest version
  const highest = getHighestVersion(publishedVersions);
  if (!highest) {
    console.info('Could not determine highest version');
    return;
  }

  console.info(`Highest version: ${highest.version} from ${highest.packageName}`);

  // Use imported root package.json
  const currentRootVersion = rootPackageJson.version;

  console.info(`Current root version: ${currentRootVersion}`);

  // Check if update is needed
  if (currentRootVersion === highest.version) {
    console.info('Root version is already up to date');
    return;
  }

  // Update root version
  const updatedPackageJson = { ...rootPackageJson, version: highest.version };
  writePackageJson('package.json', updatedPackageJson);

  console.info(`✓ Updated root version: ${currentRootVersion} → ${highest.version}`);
}

function main(): void {
  try {
    syncRootVersion();
  } catch (error) {
    console.error('Error synchronizing root version:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { compareVersions, getHighestVersion, getPublishedPackageVersions, syncRootVersion };
