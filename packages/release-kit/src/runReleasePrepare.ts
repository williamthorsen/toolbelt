/* eslint n/no-process-exit: off */
/* eslint unicorn/no-process-exit: off */

import { releasePrepareMono } from './releasePrepareMono.ts';
import type { MonorepoReleaseConfig, ReleaseType } from './types.ts';

const VALID_BUMP_TYPES: readonly string[] = ['major', 'minor', 'patch'];

function isReleaseType(value: string): value is ReleaseType {
  return VALID_BUMP_TYPES.includes(value);
}

function showHelp(): void {
  console.info(`
Usage: runReleasePrepare [options]

This script is designed for CI use via: gh workflow run release.yaml

Options:
  --dry-run             Run without modifying any files
  --bump=major|minor|patch  Override the bump type for all components
  --only=name1,name2    Only process the named components (comma-separated)
  --help                Show this help message

Examples:
  tsx .github/scripts/release-prepare.ts --dry-run
  tsx .github/scripts/release-prepare.ts --bump=minor
  tsx .github/scripts/release-prepare.ts --only=arrays,strings --dry-run
`);
}

function parseArgs(argv: string[]): {
  dryRun: boolean;
  bumpOverride: ReleaseType | undefined;
  only: string[] | undefined;
} {
  let dryRun = false;
  let bumpOverride: ReleaseType | undefined;
  let only: string[] | undefined;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--bump=')) {
      const value = arg.slice('--bump='.length);
      if (!isReleaseType(value)) {
        console.error(`Error: Invalid bump type "${value}". Must be one of: ${VALID_BUMP_TYPES.join(', ')}`);
        process.exit(1);
      }
      bumpOverride = value;
    } else if (arg.startsWith('--only=')) {
      const value = arg.slice('--only='.length);
      if (!value) {
        console.error('Error: --only requires a comma-separated list of component names');
        process.exit(1);
      }
      only = value.split(',');
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      process.exit(1);
    }
  }

  return { dryRun, bumpOverride, only };
}

/**
 * CLI runner for monorepo release preparation.
 *
 * Parses `process.argv` for `--dry-run`, `--bump=<type>`, `--only=<names>`, and `--help`,
 * validates inputs against the provided config, filters components when `--only` is used,
 * and delegates to `releasePrepareMono`.
 *
 * Designed for CI use via `gh workflow run release.yaml`.
 *
 * @param config - The monorepo release configuration.
 */
export function runReleasePrepare(config: MonorepoReleaseConfig): void {
  const { dryRun, bumpOverride, only } = parseArgs(process.argv.slice(2));

  let effectiveConfig = config;

  if (only !== undefined) {
    const knownPrefixes = config.components.map((c) => c.tagPrefix);
    const filtered = config.components.filter((c) => {
      const name = c.tagPrefix.replace(/-v$/, '');
      return only.includes(name);
    });

    for (const name of only) {
      const matchesKnown = knownPrefixes.includes(`${name}-v`);
      if (!matchesKnown) {
        const knownNames = knownPrefixes.map((p) => p.replace(/-v$/, '')).join(', ');
        console.error(`Error: Unknown component "${name}". Known components: ${knownNames}`);
        process.exit(1);
      }
    }

    effectiveConfig = { ...config, components: filtered };
  }

  try {
    releasePrepareMono(effectiveConfig, {
      dryRun,
      ...(bumpOverride === undefined ? {} : { bumpOverride }),
    });
  } catch (error: unknown) {
    console.error('Error preparing release:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
