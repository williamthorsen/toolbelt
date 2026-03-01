import { execSync } from 'node:child_process';

import type { ReleaseConfig } from './types.ts';

/**
 * Generates changelogs using git-cliff for each configured changelog path.
 *
 * Invokes the `git-cliff` binary via `execSync`. The `git-cliff` tool and a
 * `cliff.toml` configuration file must be available in the environment.
 *
 * @param config - The release configuration containing changelog paths and optional cliff config path.
 * @param tag - The git tag to generate the changelog up to (e.g., 'v1.2.3').
 * @param dryRun - If true, logs the commands without executing them.
 */
export function generateChangelogs(config: ReleaseConfig, tag: string, dryRun: boolean): void {
  const cliffConfigPath = config.cliffConfigPath ?? 'cliff.toml';

  for (const changelogPath of config.changelogPaths) {
    const outputFile = `${changelogPath}/CHANGELOG.md`;
    const cmd = ['git-cliff', `--config "${cliffConfigPath}"`, `--output "${outputFile}"`, `--tag "${tag}"`].join(' ');

    if (dryRun) {
      console.info(`  [dry-run] Would run: ${cmd}`);
      continue;
    }

    console.info(`  Generating changelog: ${outputFile}`);
    try {
      execSync(cmd, { stdio: 'inherit' });
    } catch (error: unknown) {
      throw new Error(
        `Failed to generate changelog for ${outputFile}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
