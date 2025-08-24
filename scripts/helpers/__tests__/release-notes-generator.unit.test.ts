import { describe, expect, it } from 'vitest';

import type { PackageChanges } from '../changeset-generator.js';
import { generateMonorepoReleaseNotes, generateReleaseNotes } from '../release-notes-generator.js';

describe('generateReleaseNotes', () => {
  it('generates release notes with consumer-facing changes', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/eslint-config-typescript': {
        breaking: [{ description: 'Remove deprecated API', hash: 'abc123' }],
        features: [
          { description: 'Add new linting rule', hash: 'def456' },
          { description: 'Improve error messages', hash: 'ghi789' },
        ],
        fixes: [{ description: 'Fix rule configuration bug', hash: 'jkl012' }],
        refactoring: [{ description: 'Internal refactor', hash: 'mno345' }],
        tests: [{ description: 'Add test coverage', hash: 'pqr678' }],
        dependencies: [{ description: 'Upgrade ESLint to v9', hash: 'stu901' }],
        ci: [{ description: 'Update CI config', hash: 'vwx234' }],
        tooling: [{ description: 'Update build script', hash: 'yz567' }],
        ai: [{ description: 'Update AI rules', hash: 'abc890' }],
        documentation: [{ description: 'Update README', hash: 'def123' }],
      },
    };

    const result = generateReleaseNotes(changes, '2.1.0');

    expect(result).toHaveLength(1);

    const firstResult = result[0];
    expect(firstResult).toBeDefined();
    if (!firstResult) return;

    expect(firstResult).toEqual({
      packageName: '@williamthorsen/eslint-config-typescript',
      version: '2.1.0',
      hasBreakingChanges: true,
      content: `## 🚨 Breaking Changes

- Remove deprecated API

## ✨ Features

- Add new linting rule
- Improve error messages

## 🐛 Fixes

- Fix rule configuration bug

## 📦 Dependencies

- Upgrade ESLint to v9`,
    });
  });

  it('excludes internal changes from release notes', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/strict-lint': {
        breaking: [],
        features: [],
        fixes: [],
        refactoring: [{ description: 'Refactor code structure', hash: 'abc123' }],
        tests: [{ description: 'Add unit tests', hash: 'def456' }],
        dependencies: [],
        ci: [{ description: 'Update GitHub Actions', hash: 'ghi789' }],
        tooling: [{ description: 'Update TypeScript config', hash: 'jkl012' }],
        ai: [{ description: 'Update AI configurations', hash: 'mno345' }],
        documentation: [{ description: 'Update documentation', hash: 'pqr678' }],
      },
    };

    const result = generateReleaseNotes(changes, '1.5.0');

    expect(result).toHaveLength(1);

    const firstResult = result[0];
    expect(firstResult).toBeDefined();
    if (!firstResult) return;

    expect(firstResult).toEqual({
      packageName: '@williamthorsen/strict-lint',
      version: '1.5.0',
      hasBreakingChanges: false,
      content: '## 🔧 Internal Changes\n\nThis release contains internal improvements and maintenance updates.',
    });
  });

  it('handles mixed consumer-facing and internal changes', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/eslint-config-typescript': {
        breaking: [],
        features: [{ description: 'Add new rule', hash: 'abc123' }],
        fixes: [],
        refactoring: [{ description: 'Internal cleanup', hash: 'def456' }],
        tests: [{ description: 'Add tests', hash: 'ghi789' }],
        dependencies: [{ description: 'Update dependency', hash: 'jkl012' }],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    };

    const result = generateReleaseNotes(changes, '3.0.0');

    const firstResult = result[0];
    expect(firstResult).toBeDefined();
    if (!firstResult) return;

    expect(firstResult.content).toBe(`## ✨ Features

- Add new rule

## 📦 Dependencies

- Update dependency`);
    expect(firstResult.hasBreakingChanges).toBe(false);
  });

  it('handles multiple packages', () => {
    const changes: Record<string, PackageChanges> = {
      '@williamthorsen/eslint-config-typescript': {
        breaking: [],
        features: [{ description: 'TypeScript feature', hash: 'abc123' }],
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
        fixes: [{ description: 'Bug fix', hash: 'def456' }],
        refactoring: [],
        tests: [],
        dependencies: [],
        ci: [],
        tooling: [],
        ai: [],
        documentation: [],
      },
    };

    const result = generateReleaseNotes(changes, '1.0.0');

    expect(result).toHaveLength(2);

    const firstResult = result[0];
    const secondResult = result[1];
    expect(firstResult).toBeDefined();
    expect(secondResult).toBeDefined();
    if (!firstResult || !secondResult) return;

    expect(firstResult.packageName).toBe('@williamthorsen/eslint-config-typescript');
    expect(secondResult.packageName).toBe('@williamthorsen/strict-lint');
  });

  it('handles empty changes object', () => {
    const changes: Record<string, PackageChanges> = {};
    const result = generateReleaseNotes(changes, '1.0.0');
    expect(result).toHaveLength(0);
  });
});

describe('generateMonorepoReleaseNotes', () => {
  it('generates monorepo release notes for single package', () => {
    const packageReleaseNotes = [
      {
        packageName: '@williamthorsen/eslint-config-typescript',
        version: '2.0.0',
        content: 'Package content',
        hasBreakingChanges: true,
      },
    ];

    const result = generateMonorepoReleaseNotes(packageReleaseNotes, '2.0.0');

    expect(result).toContain('# Release 2.0.0');
    expect(result).toContain('⚠️ **This release contains breaking changes');
    expect(result).toContain('Updated package: **@williamthorsen/eslint-config-typescript**');
    expect(result).toContain('See individual package changelogs');
  });

  it('generates monorepo release notes for multiple packages', () => {
    const packageReleaseNotes = [
      {
        packageName: '@williamthorsen/eslint-config-typescript',
        version: '1.5.0',
        content: 'Content 1',
        hasBreakingChanges: false,
      },
      {
        packageName: '@williamthorsen/strict-lint',
        version: '1.2.0',
        content: 'Content 2',
        hasBreakingChanges: false,
      },
    ];

    const result = generateMonorepoReleaseNotes(packageReleaseNotes, '1.5.0');

    expect(result).toContain('# Release 1.5.0');
    expect(result).not.toContain('breaking changes');
    expect(result).toContain('Updated packages:');
    expect(result).toContain('- **@williamthorsen/eslint-config-typescript**');
    expect(result).toContain('- **@williamthorsen/strict-lint**');
  });

  it('handles no package updates', () => {
    const result = generateMonorepoReleaseNotes([], '1.0.0');
    expect(result).toBe('# Release 1.0.0\n\nNo published packages were updated in this release.\n');
  });

  it('shows breaking changes warning when any package has breaking changes', () => {
    const packageReleaseNotes = [
      {
        packageName: '@williamthorsen/eslint-config-typescript',
        version: '1.0.0',
        content: 'Content',
        hasBreakingChanges: false,
      },
      {
        packageName: '@williamthorsen/strict-lint',
        version: '2.0.0',
        content: 'Content',
        hasBreakingChanges: true,
      },
    ];

    const result = generateMonorepoReleaseNotes(packageReleaseNotes, '2.0.0');
    expect(result).toContain('⚠️ **This release contains breaking changes');
  });
});
