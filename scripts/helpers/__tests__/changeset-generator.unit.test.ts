import { beforeEach, describe, expect, it, vi } from 'vitest';

import { type ParsedCommit } from '~/scripts/helpers/parseCommitMessage.ts';
import { getWorkspacePackages } from '~/scripts/helpers/workspace-discovery.ts';

import {
  categorizeChanges,
  type Commit,
  generateChangelogContent,
  getAffectedWorkspaces,
  type PackageChanges,
} from '../changeset-generator.ts';

// Mock the workspace package discovery for tests
vi.mock('../workspace-discovery.ts', () => ({
  getWorkspacePackages: vi.fn(),
}));

const mockedGetWorkspacePackages = vi.mocked(getWorkspacePackages);

describe(categorizeChanges, () => {
  beforeEach(() => {
    // Setup mock to return test data
    mockedGetWorkspacePackages.mockReturnValue({
      workspace1: '@williamthorsen/workspace1',
      workspace2: '@williamthorsen/workspace2',
      ts: '@williamthorsen/workspace1', // Map 'ts' to workspace1 for backward compatibility
    });
  });

  it('categorizes simple commits correctly', () => {
    const commits: Commit[] = [
      { hash: 'abc123', message: 'workspace1|feat: Add new rule' },
      { hash: 'def456', message: 'workspace2|deps: Upgrade dependency' },
      { hash: 'ghi789', message: 'workspace1|feat!: Remove old API' },
    ];

    const result = categorizeChanges(commits);

    expect(result).toStrictEqual({
      '@williamthorsen/workspace1': {
        breaking: [{ description: 'Remove old API', hash: 'ghi789' }],
        features: [
          { description: 'Add new rule', hash: 'abc123' },
          { description: 'Remove old API', hash: 'ghi789' },
        ],
        fixes: [],
        refactoring: [],
        tests: [],
        dependencies: [],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
      '@williamthorsen/workspace2': {
        breaking: [],
        features: [],
        fixes: [],
        refactoring: [],
        tests: [],
        dependencies: [{ description: 'Upgrade dependency', hash: 'def456' }],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    });
  });

  it('ignores commits for unpublished packages', () => {
    const commits: Commit[] = [
      { hash: 'abc123', message: 'basic|feat: Add rule to basic package' },
      { hash: 'def456', message: 'root|tooling: Update root config' },
    ];

    const result = categorizeChanges(commits);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles unknown work types gracefully', () => {
    const commits: Commit[] = [{ hash: 'abc123', message: 'ts|unknown: Some change' }];

    const result = categorizeChanges(commits);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('handles invalid commit messages gracefully', () => {
    const commits: Commit[] = [
      { hash: 'abc123', message: 'invalid commit message' },
      { hash: 'def456', message: 'ts|feat: Valid change' },
    ];

    const result = categorizeChanges(commits);

    expect(result).toStrictEqual({
      '@williamthorsen/workspace1': {
        breaking: [],
        features: [{ description: 'Valid change', hash: 'def456' }],
        fixes: [],
        refactoring: [],
        tests: [],
        dependencies: [],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    });
  });
});

describe(getAffectedWorkspaces, () => {
  it('returns specified workspace for non-wildcard commits', () => {
    const commit: Commit = { hash: 'abc123', message: 'ts|feat: Add rule' };
    const parsedCommit: ParsedCommit = {
      workspace: 'ts',
      workType: 'feat',
      isBreaking: false,
      description: 'Add rule',
    };

    const result = getAffectedWorkspaces(commit, parsedCommit);

    expect(result).toStrictEqual(['ts']);
  });

  it('returns specified workspace for specific workspace commits', () => {
    const commit: Commit = { hash: 'def456', message: 'workspace2|deps: Upgrade' };
    const parsedCommit: ParsedCommit = {
      workspace: 'workspace2',
      workType: 'deps',
      isBreaking: false,
      description: 'Upgrade',
    };

    const result = getAffectedWorkspaces(commit, parsedCommit);

    expect(result).toStrictEqual(['workspace2']);
  });

  // Note: Testing wildcard commits (*) would require mocking git commands
  // since it analyzes changed files, which is outside the scope of unit tests
});

describe(generateChangelogContent, () => {
  it('generates correct changelog format', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/workspace1': {
        breaking: [{ description: 'Remove old API', hash: 'ghi789' }],
        features: [
          { description: 'Add new rule', hash: 'abc123' },
          { description: 'Improve existing rule', hash: 'jkl012' },
        ],
        fixes: [],
        refactoring: [],
        tests: [],
        dependencies: [{ description: 'Upgrade ESLint', hash: 'mno345' }],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    };

    const result = generateChangelogContent(changes);

    expect(result).toBe(
      `## @williamthorsen/workspace1

### Breaking changes

- Remove old API

### Features

- Add new rule
- Improve existing rule

### Dependencies

- Upgrade ESLint

`,
    );
  });

  it('handles multiple packages', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/workspace1': {
        breaking: [],
        features: [{ description: 'Add rule', hash: 'abc123' }],
        fixes: [],
        refactoring: [],
        tests: [],
        dependencies: [],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
      '@williamthorsen/workspace2': {
        breaking: [],
        features: [],
        fixes: [{ description: 'Fix bug', hash: 'def456' }],
        refactoring: [],
        tests: [],
        dependencies: [],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    };

    const result = generateChangelogContent(changes);

    expect(result).toContain('## @williamthorsen/workspace1');
    expect(result).toContain('## @williamthorsen/workspace2');
    expect(result).toContain('### Features\n\n- Add rule');
    expect(result).toContain('### Fixes\n\n- Fix bug');
  });

  it('omits empty sections', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/workspace1': {
        breaking: [],
        features: [{ description: 'Add rule', hash: 'abc123' }],
        fixes: [],
        refactoring: [],
        tests: [],
        dependencies: [],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    };

    const result = generateChangelogContent(changes);

    expect(result).toContain('### Features');
    expect(result).not.toContain('### Breaking changes');
    expect(result).not.toContain('### Fixes');
    expect(result).not.toContain('### Dependencies');
  });
});
