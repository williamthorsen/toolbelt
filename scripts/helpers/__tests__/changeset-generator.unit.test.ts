import { describe, expect, it } from 'vitest';

import {
  categorizeChanges,
  type Commit,
  generateChangelogContent,
  type PackageChanges,
  parseCommitMessage,
} from '../changeset-generator.js';

describe('parseCommitMessage', () => {
  it('parses standard commit message correctly', () => {
    const result = parseCommitMessage('ts|feat: Add new linting rule');
    expect(result).toEqual({
      workspace: 'ts',
      workType: 'feat',
      isBreaking: false,
      description: 'Add new linting rule',
    });
  });

  it('parses breaking change commit', () => {
    const result = parseCommitMessage('ts|feat!: Remove deprecated API');
    expect(result).toEqual({
      workspace: 'ts',
      workType: 'feat',
      isBreaking: true,
      description: 'Remove deprecated API',
    });
  });

  it('parses multi-workspace commit', () => {
    const result = parseCommitMessage('*|deps: Upgrade all deps to latest version');
    expect(result).toEqual({
      workspace: '*',
      workType: 'deps',
      isBreaking: false,
      description: 'Upgrade all deps to latest version',
    });
  });

  it('parses multi-type commit', () => {
    const result = parseCommitMessage('ts|*: Modernize tooling and add tests');
    expect(result).toEqual({
      workspace: 'ts',
      workType: '*',
      isBreaking: false,
      description: 'Modernize tooling and add tests',
    });
  });

  it('handles whitespace correctly', () => {
    const result = parseCommitMessage(' root | tooling : Update build script ');
    expect(result).toEqual({
      workspace: 'root',
      workType: 'tooling',
      isBreaking: false,
      description: 'Update build script',
    });
  });

  it('returns null for invalid format', () => {
    expect(parseCommitMessage('Invalid commit message')).toBeNull();
    expect(parseCommitMessage('feat: Missing workspace')).toBeNull();
    expect(parseCommitMessage('ts|: Missing work type')).toBeNull();
  });
});

describe('categorizeChanges', () => {
  it('categorizes simple commits correctly', () => {
    const commits: Commit[] = [
      { hash: 'abc123', message: 'ts|feat: Add new rule' },
      { hash: 'def456', message: 'strict-lint|deps: Upgrade dependency' },
      { hash: 'ghi789', message: 'ts|feat!: Remove old API' },
    ];

    const result = categorizeChanges(commits);

    expect(result).toEqual({
      '@williamthorsen/eslint-config-typescript': {
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
      '@williamthorsen/strict-lint': {
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

    expect(result).toEqual({
      '@williamthorsen/eslint-config-typescript': {
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

describe('generateChangelogContent', () => {
  it('generates correct changelog format', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/eslint-config-typescript': {
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
      `## @williamthorsen/eslint-config-typescript

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
      '@williamthorsen/eslint-config-typescript': {
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
      '@williamthorsen/strict-lint': {
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

    expect(result).toContain('## @williamthorsen/eslint-config-typescript');
    expect(result).toContain('## @williamthorsen/strict-lint');
    expect(result).toContain('### Features\n\n- Add rule');
    expect(result).toContain('### Fixes\n\n- Fix bug');
  });

  it('omits empty sections', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/eslint-config-typescript': {
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
