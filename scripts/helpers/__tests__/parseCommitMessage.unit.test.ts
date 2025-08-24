import { describe, expect, it } from 'vitest';

import { parseCommitMessage } from '~/scripts/helpers/parseCommitMessage.js';

describe(parseCommitMessage, () => {
  it('parses standard commit message correctly', () => {
    const result = parseCommitMessage('ts|feat: Add new linting rule');
    expect(result).toStrictEqual({
      workspace: 'ts',
      workType: 'feat',
      isBreaking: false,
      description: 'Add new linting rule',
    });
  });

  it('parses breaking change commit', () => {
    const result = parseCommitMessage('ts|feat!: Remove deprecated API');
    expect(result).toStrictEqual({
      workspace: 'ts',
      workType: 'feat',
      isBreaking: true,
      description: 'Remove deprecated API',
    });
  });

  it('parses multi-workspace commit', () => {
    const result = parseCommitMessage('*|deps: Upgrade all deps to latest version');
    expect(result).toStrictEqual({
      workspace: '*',
      workType: 'deps',
      isBreaking: false,
      description: 'Upgrade all deps to latest version',
    });
  });

  it('parses multi-type commit', () => {
    const result = parseCommitMessage('ts|*: Modernize tooling and add tests');
    expect(result).toStrictEqual({
      workspace: 'ts',
      workType: '*',
      isBreaking: false,
      description: 'Modernize tooling and add tests',
    });
  });

  it('handles whitespace correctly', () => {
    const result = parseCommitMessage(' root | tooling : Update build script ');
    expect(result).toStrictEqual({
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
