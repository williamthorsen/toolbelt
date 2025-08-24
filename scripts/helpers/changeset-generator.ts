import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { isKeyOf } from '~/packages/objects/src/3-candidate/isKeyOf.ts';

/**
 * Helper functions for generating changesets from commit messages
 */

export interface Commit {
  hash: string;
  message: string;
}

export interface ParsedCommit {
  workspace: string;
  workType: string;
  isBreaking: boolean;
  description: string;
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

function isPackageJson(value: unknown): value is { name?: string } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('name' in value)) {
    return true; // Valid package.json without name field
  }

  return typeof value.name === 'string';
}

function getWorkspacePackageMapping(): Record<string, string> {
  const packagesDir = join(process.cwd(), 'packages');
  const workspacePackageMap: Record<string, string> = {};

  try {
    const workspaceDirs = execCommand('ls packages').split('\n').filter(Boolean);

    for (const workspaceDir of workspaceDirs) {
      // Skip template and other non-package directories
      if (workspaceDir.startsWith('_')) continue;

      try {
        const packageJsonPath = join(packagesDir, workspaceDir, 'package.json');
        const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
        const packageJsonData: unknown = JSON.parse(packageJsonContent);

        if (isPackageJson(packageJsonData) && packageJsonData.name) {
          workspacePackageMap[workspaceDir] = packageJsonData.name;
        }
      } catch {
        // Skip directories without valid package.json
        console.warn(`Warning: Could not read package.json for workspace ${workspaceDir}`);
      }
    }
  } catch (error) {
    console.error('Error reading workspace packages:', error);
  }

  return workspacePackageMap;
}

// Cache the mapping since it's expensive to compute
let _workspacePackageMapping: Record<string, string> | null = null;
function getWorkspacePackages(): Record<string, string> {
  if (!_workspacePackageMapping) {
    _workspacePackageMapping = getWorkspacePackageMapping();
  }
  return _workspacePackageMapping;
}

function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    throw new Error(`Command failed: ${command}\n${error instanceof Error ? error.message : String(error)}`);
  }
}

export function parseCommitMessage(message: string): ParsedCommit | null {
  const match = message.match(/^([^|]+)\|([^!:]+)(!?): (.+)$/);
  if (!match) {
    console.warn(`Warning: Commit message does not match format: ${message}`);
    return null;
  }

  const [, workspace, workType, breakingFlag, description] = match;
  if (!workspace || !workType || !description) {
    return null;
  }
  return {
    workspace: workspace.trim(),
    workType: workType.trim(),
    isBreaking: breakingFlag === '!',
    description: description.trim(),
  };
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
