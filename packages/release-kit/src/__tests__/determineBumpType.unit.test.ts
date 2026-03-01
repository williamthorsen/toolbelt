import { describe, expect, it } from 'vitest';

import { determineBumpType } from '../determineBumpType.ts';
import type { ParsedCommit, WorkTypeConfig } from '../types.ts';

const workTypes: WorkTypeConfig[] = [
  { type: 'fix', header: 'Bug fixes', bump: 'patch', aliases: ['bugfix'] },
  { type: 'feat', header: 'Features', bump: 'minor', aliases: ['feature'] },
  { type: 'refactor', header: 'Refactoring', bump: 'patch' },
  { type: 'docs', header: 'Documentation', bump: 'patch', aliases: ['doc'] },
];

function makeCommit(overrides: Partial<ParsedCommit> & Pick<ParsedCommit, 'type'>): ParsedCommit {
  return {
    message: `${overrides.type}: test`,
    hash: 'abc123',
    description: 'test',
    breaking: false,
    ...overrides,
  };
}

describe(determineBumpType, () => {
  it('returns undefined for an empty commit list', () => {
    const result = determineBumpType([], workTypes);
    expect(result).toBeUndefined();
  });

  it('returns patch for a fix commit', () => {
    const commits = [makeCommit({ type: 'fix' })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBe('patch');
  });

  it('returns minor for a feat commit', () => {
    const commits = [makeCommit({ type: 'feat' })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBe('minor');
  });

  it('returns the highest priority bump when multiple types are present', () => {
    const commits = [makeCommit({ type: 'fix' }), makeCommit({ type: 'feat' }), makeCommit({ type: 'docs' })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBe('minor');
  });

  it('returns major for a breaking change', () => {
    const commits = [makeCommit({ type: 'fix' }), makeCommit({ type: 'feat', breaking: true })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBe('major');
  });

  it('returns major even when breaking change is a patch type', () => {
    const commits = [makeCommit({ type: 'fix', breaking: true })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBe('major');
  });

  it('ignores commits with unrecognized types', () => {
    const commits = [makeCommit({ type: 'unknown' })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBeUndefined();
  });

  it('returns the correct bump when some commits are unrecognized', () => {
    const commits = [makeCommit({ type: 'unknown' }), makeCommit({ type: 'fix' })];
    const result = determineBumpType(commits, workTypes);
    expect(result).toBe('patch');
  });
});
