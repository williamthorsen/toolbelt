import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { categorizeChanges, type Commit, generateChangelogContent } from './helpers/changeset-generator.js';
import { generateReleaseNotes } from './helpers/release-notes-generator.js';

/**
 * Generate automated changeset from commit messages since last release
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

function getCommitsSinceRelease(): Commit[] {
  const lastRelease = getLastReleaseTag();
  const commits = execCommand(`git log ${lastRelease}..HEAD --oneline --no-merges`);

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
  console.log(`Created changeset: ${filename}`);
  return filepath;
}

function main(): void {
  console.log('Generating automated changeset...');

  const commits = getCommitsSinceRelease();
  console.log(`Found ${commits.length} commits since last release`);

  const changes = categorizeChanges(commits);

  if (Object.keys(changes).length === 0) {
    console.log('No changes found for published packages');
    return;
  }

  const content = generateChangelogContent(changes);
  const changesetPath = createChangesetFile(content);

  console.log('\nGenerated changeset content:');
  console.log('='.repeat(50));
  console.log(content);
  console.log('='.repeat(50));
  console.log(`\nChangeset saved to: ${changesetPath}`);

  // Generate release notes for preview
  const releaseNotes = generateReleaseNotes(changes, 'X.X.X');
  if (releaseNotes.length > 0) {
    console.log('\nRelease notes preview:');
    console.log('='.repeat(50));
    releaseNotes.forEach((notes) => {
      console.log(`\n## ${notes.packageName}\n`);
      console.log(notes.content);
    });
    console.log('='.repeat(50));
  }
  console.log('\nNext steps:');
  console.log('1. Review the generated changeset');
  console.log('2. Edit if necessary');
  console.log('3. Commit the changeset');
  console.log('4. Run: pnpm changeset version');
  console.log('5. Run: pnpm changeset publish');
}

// Check if this file is being run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
