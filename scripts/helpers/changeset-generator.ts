import { execSync } from 'node:child_process';

import { isKeyOf } from '~/packages/objects/src/3-candidate/isKeyOf.ts';
import { parseCommitMessage, type ParsedCommit } from '~/scripts/helpers/parseCommitMessage.ts';
import { getWorkspacePackages } from '~/scripts/helpers/workspace-discovery.ts';

/**
 * Helper functions for generating changesets from commit messages
 */

export interface Commit {
  hash: string;
  message: string;
}

export interface ChangeEntry {
  description: string;
  hash: string;
}

export interface PackageChanges {
  breaking: ChangeEntry[];
  features: ChangeEntry[];
  fixes: ChangeEntry[];
  refactoring: ChangeEntry[];
  tests: ChangeEntry[];
  dependencies: ChangeEntry[];
  ci: ChangeEntry[];
  tooling: ChangeEntry[];
  ai: ChangeEntry[];
  documentation: ChangeEntry[];
}

const WORK_TYPE_TO_CATEGORY = {
  ai: 'AI',
  ci: 'CI',
  deps: 'Dependencies',
  docs: 'Documentation',
  feat: 'Features',
  refactor: 'Refactoring',
  tests: 'Tests',
  tooling: 'Tooling',
} as const;

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

function getWorkspaceFromFilePath(filePath: string): string {
  const packageMatch = filePath.match(/^packages\/([^/]+)\//);
  if (packageMatch?.[1]) {
    return packageMatch[1];
  }
  return 'root';
}

export function getAffectedWorkspaces(commit: Commit, parsedCommit: ParsedCommit): string[] {
  if (parsedCommit.workspace !== '*') {
    return [parsedCommit.workspace];
  }

  // For * commits, analyze changed files to determine workspaces
  const changedFiles = execCommand(`git diff-tree --no-commit-id --name-only -r ${commit.hash}`);
  const workspaces = new Set<string>();

  changedFiles.split('\n').forEach((file) => {
    workspaces.add(getWorkspaceFromFilePath(file));
  });

  return Array.from(workspaces);
}

export function categorizeChanges(commits: Commit[]): Record<string, PackageChanges> {
  const changesByPackage: Record<string, PackageChanges> = {};
  const workspacePackages = getWorkspacePackages();

  commits.forEach((commit) => {
    const parsed = parseCommitMessage(commit.message);
    if (!parsed) return;

    const workspaces = getAffectedWorkspaces(commit, parsed);

    workspaces.forEach((workspace) => {
      // Skip root and non-package workspaces
      if (workspace === 'root') return;

      const packageName = workspacePackages[workspace];
      if (!packageName) return;

      const { workType } = parsed;
      if (!isKeyOf(workType, WORK_TYPE_TO_CATEGORY)) {
        console.warn(`Unknown work type: ${parsed.workType}`);
        return;
      }
      const category = WORK_TYPE_TO_CATEGORY[workType];

      if (!changesByPackage[packageName]) {
        changesByPackage[packageName] = {
          breaking: [],
          features: [],
          fixes: [],
          refactoring: [],
          tests: [],
          dependencies: [],
          ci: [],
          tooling: [],
          ai: [],
          documentation: [],
        };
      }

      const entry: ChangeEntry = {
        description: parsed.description,
        hash: commit.hash,
      };

      if (parsed.isBreaking) {
        changesByPackage[packageName].breaking.push(entry);
      }

      // Map categories to changelog sections
      const categoryMap = {
        AI: 'ai',
        CI: 'ci',
        Dependencies: 'dependencies',
        Documentation: 'documentation',
        Features: 'features',
        Refactoring: 'refactoring',
        Tests: 'tests',
        Tooling: 'tooling',
      } as const;

      if (isKeyOf(category, categoryMap)) {
        const section = categoryMap[category];
        changesByPackage[packageName][section].push(entry);
      }
    });
  });

  return changesByPackage;
}

export function generateChangelogContent(changes: Record<string, PackageChanges>): string {
  let content = '';

  Object.entries(changes).forEach(([packageName, packageChanges]) => {
    if (content) content += '\n\n';

    content += `## ${packageName}\n\n`;

    // Order sections by importance
    const sections: Array<[keyof PackageChanges, string]> = [
      ['breaking', 'Breaking changes'],
      ['features', 'Features'],
      ['fixes', 'Fixes'],
      ['refactoring', 'Refactoring'],
      ['tests', 'Tests'],
      ['dependencies', 'Dependencies'],
      ['ci', 'CI'],
      ['tooling', 'Tooling'],
      ['ai', 'AI'],
      ['documentation', 'Documentation'],
    ];

    sections.forEach(([key, title]) => {
      const items = packageChanges[key];
      if (items.length > 0) {
        content += `### ${title}\n\n`;
        items.forEach((item) => {
          content += `- ${item.description}\n`;
        });
        content += '\n';
      }
    });
  });

  return content;
}
