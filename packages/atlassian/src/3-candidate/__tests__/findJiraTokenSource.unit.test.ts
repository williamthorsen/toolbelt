import type { SecretQuery, SecretStore } from '@williamthorsen/toolbelt.secrets/candidate';
import { describe, expect, it, vi } from 'vitest';

import { findJiraTokenSource } from '../findJiraTokenSource.ts';

const ACCOUNT = 'someone@example.com';

describe(findJiraTokenSource, () => {
  it('reports a supplied token ahead of every other source', () => {
    const source = findJiraTokenSource({
      account: ACCOUNT,
      env: { JIRA_API_TOKEN: 'from-env' },
      runCommand: () => 'from-command',
      store: createStore(true),
      token: 'supplied',
      tokenCommand: 'print-token',
    });

    expect(source).toBe('supplied');
  });

  it('reports the environment ahead of the command', () => {
    const runCommand = vi.fn(() => 'from-command');

    const source = findJiraTokenSource({
      account: ACCOUNT,
      env: { JIRA_API_TOKEN: 'from-env' },
      runCommand,
      tokenCommand: 'print-token',
    });

    expect(source).toBe('env');
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('reports the command ahead of the keychain', () => {
    const store = createStore(true);

    const source = findJiraTokenSource({
      account: ACCOUNT,
      env: {},
      runCommand: () => 'from-command',
      store,
      tokenCommand: 'print-token',
    });

    expect(source).toBe('command');
    expect(store.hasSecret).not.toHaveBeenCalled();
  });

  it('reports the keychain, probing it under the account and the default service', () => {
    const store = createStore(true);

    expect(findJiraTokenSource({ account: ACCOUNT, env: {}, store })).toBe('keychain');
    expect(store.hasSecret).toHaveBeenCalledWith({ account: ACCOUNT, service: 'toolbelt.atlassian.jira' });
  });

  it('probes the keychain rather than reading it, so no access prompt is raised', () => {
    const store = createStore(true);

    findJiraTokenSource({ account: ACCOUNT, env: {}, store });

    expect(store.findSecret).not.toHaveBeenCalled();
  });

  it('returns undefined where every source misses', () => {
    expect(findJiraTokenSource({ account: ACCOUNT, env: {}, store: createStore(false) })).toBeUndefined();
  });

  it('walks the same order as the resolver, treating a silent command as a miss', () => {
    const store = createStore(true);

    const source = findJiraTokenSource({
      account: ACCOUNT,
      env: {},
      runCommand: () => '  ',
      store,
      tokenCommand: 'quiet',
    });

    expect(source).toBe('keychain');
  });
});

// region | Helpers

function createStore(stored: boolean): SecretStore & {
  findSecret: ReturnType<typeof vi.fn>;
  hasSecret: ReturnType<typeof vi.fn>;
} {
  return {
    deleteSecret: vi.fn(() => false),
    findSecret: vi.fn((_query: SecretQuery) => (stored ? 'a-token' : undefined)),
    hasSecret: vi.fn((_query: SecretQuery) => stored),
  };
}

// endregion | Helpers
