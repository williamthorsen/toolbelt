import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { categorizeChanges, type Commit, generateChangelogContent } from './helpers/changeset-generator.js';
import { generateReleaseNotes } from './helpers/release-notes-generator.js';

/**
 * Generate automated changeset from commit messages since target commit
 */

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

function getLastReleaseTag(): string {
  try {
    return execCommand('git describe --tags --abbrev=0');
  } catch {
    // If no tags exist, use first commit
    const firstCommit = execCommand('git rev-list --max-parents=0 HEAD').split('\n')[0];
    if (!firstCommit) {
      throw new Error('No commits found in repository');
    }
    return firstCommit;
  }
}

function validateGitReference(ref: string): boolean {
  try {
    execCommand(`git rev-parse --verify ${ref}`);
    return true;
  } catch {
    return false;
  }
}

function parseCommandLineArgs(): { targetCommit: string | undefined; showHelp: boolean } {
  const args = process.argv.slice(2);
  let targetCommit: string | undefined;
  let showHelp = false;

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      showHelp = true;
    } else if (arg.startsWith('--since=')) {
      targetCommit = arg.split('=', 2)[1];
      if (!targetCommit) {
        console.error('Error: --since requires a value (e.g., --since=HEAD~1)');
        showHelp = true;
      }
    } else if (arg.startsWith('--since')) {
      console.error('Error: --since requires a value in format --since={commit}');
      showHelp = true;
    } else {
      console.error(`Error: Unknown argument: ${arg}`);
      showHelp = true;
    }
  }

  return { targetCommit, showHelp };
}

function showHelpMessage(): void {
  console.info(`
Usage: node scripts/generate-changeset.ts [options]

Options:
  --since={commit}    Generate changeset from commits since the specified git reference
                      Examples: --since=HEAD~5, --since=main, --since=abc123
  -h, --help          Show this help message

If --since is not provided, will use the last release tag as the target.
`);
}

function getCommitsSinceTarget(targetCommit?: string): Commit[] {
  const target = targetCommit || getLastReleaseTag();

  if (!validateGitReference(target)) {
    throw new Error(`Invalid git reference: ${target}`);
  }

  const commits = execCommand(`git log ${target}..HEAD --oneline --no-merges`);

  if (!commits) {
    return [];
  }

  return commits.split('\n').map((line) => {
    const [hash, ...messageParts] = line.split(' ');
    if (!hash) {
      throw new Error(`Invalid commit line: ${line}`);
    }
    return {
      hash,
      message: messageParts.join(' '),
    };
  });
}

function createChangesetFile(content: string): string {
  const timestamp = Date.now();
  const filename = `automated-changeset-${timestamp}.md`;
  const filepath = join('.changeset', filename);

  // Create changeset content with frontmatter
  const changesetContent = `---
"@williamthorsen/eslint-config-typescript": patch
"@williamthorsen/strict-lint": patch
---

${content}`;

  writeFileSync(filepath, changesetContent);
  console.info(`Created changeset: ${filename}`);
  return filepath;
}

function main(): void {
  const { targetCommit, showHelp } = parseCommandLineArgs();

  if (showHelp) {
    showHelpMessage();
    return;
  }

  console.info('Generating automated changeset...');

  const commits = getCommitsSinceTarget(targetCommit);
  const targetDescription = targetCommit || 'last release';
  console.info(`Found ${commits.length} commits since ${targetDescription}`);

  const changes = categorizeChanges(commits);

  if (Object.keys(changes).length === 0) {
    console.info('No changes found for published packages');
    return;
  }

  const content = generateChangelogContent(changes);
  const changesetPath = createChangesetFile(content);

  console.info('\nGenerated changeset content:');
  console.info('='.repeat(50));
  console.info(content);
  console.info('='.repeat(50));
  console.info(`\nChangeset saved to: ${changesetPath}`);

  // Generate release notes for preview
  const releaseNotes = generateReleaseNotes(changes, 'X.X.X');
  if (releaseNotes.length > 0) {
    console.info('\nRelease notes preview:');
    console.info('='.repeat(50));
    releaseNotes.forEach((notes) => {
      console.info(`\n## ${notes.packageName}\n`);
      console.info(notes.content);
    });
    console.info('='.repeat(50));
  }
  console.info('\nNext steps:');
  console.info('1. Review the generated changeset');
  console.info('2. Edit if necessary');
  console.info('3. Commit the changeset');
  console.info('4. Run: pnpm changeset version');
  console.info('5. Run: pnpm changeset publish');
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
