import type { SecretQuery, SecretStore } from '@williamthorsen/toolbelt.secrets/candidate';
import { describe, expect, it, vi } from 'vitest';

import { resolveJiraToken } from '../resolveJiraToken.ts';

const ACCOUNT = 'someone@example.com';

describe(resolveJiraToken, () => {
  it('prefers a supplied token over every other source', () => {
    const store = createStore('from-store');

    const token = resolveJiraToken({
      account: ACCOUNT,
      env: { JIRA_API_TOKEN: 'from-env' },
      runCommand: () => 'from-command',
      store,
      token: 'supplied',
      tokenCommand: 'print-token',
    });

    expect(token).toBe('supplied');
    expect(store.findSecret).not.toHaveBeenCalled();
  });

  it('falls back to the environment before the command', () => {
    const runCommand = vi.fn(() => 'from-command');

    const token = resolveJiraToken({
      account: ACCOUNT,
      env: { JIRA_API_TOKEN: 'from-env' },
      runCommand,
      tokenCommand: 'print-token',
    });

    expect(token).toBe('from-env');
    expect(runCommand).not.toHaveBeenCalled();
  });

  it('falls back to the command before the store', () => {
    const store = createStore('from-store');

    const token = resolveJiraToken({
      account: ACCOUNT,
      env: {},
      runCommand: () => 'from-command',
      store,
      tokenCommand: 'print-token',
    });

    expect(token).toBe('from-command');
    expect(store.findSecret).not.toHaveBeenCalled();
  });

  it('falls back to the store, reading it under the account and the default service', () => {
    const store = createStore('from-store');

    expect(resolveJiraToken({ account: ACCOUNT, env: {}, store })).toBe('from-store');
    expect(store.findSecret).toHaveBeenCalledWith({ account: ACCOUNT, service: 'toolbelt.atlassian.jira' });
  });

  it('reads the store under a named service', () => {
    const store = createStore('from-store');

    resolveJiraToken({ account: ACCOUNT, env: {}, service: 'custom.service', store });

    expect(store.findSecret).toHaveBeenCalledWith({ account: ACCOUNT, service: 'custom.service' });
  });

  it('treats a command that prints nothing as a miss and reads the store', () => {
    const store = createStore('from-store');

    const token = resolveJiraToken({ account: ACCOUNT, env: {}, runCommand: () => '  ', store, tokenCommand: 'quiet' });

    expect(token).toBe('from-store');
  });

  it('consults no command where none is configured', () => {
    const runCommand = vi.fn(() => 'from-command');

    resolveJiraToken({ account: ACCOUNT, env: {}, runCommand, store: createStore('from-store') });

    expect(runCommand).not.toHaveBeenCalled();
  });

  it('names the storing command where every source misses', () => {
    const store = createStore(undefined);

    expect(() => resolveJiraToken({ account: ACCOUNT, env: {}, store })).toThrow(
      `tb-secret set toolbelt.atlassian.jira --account ${ACCOUNT}`,
    );
  });
});

// region | Helpers

function createStore(secret: string | undefined): SecretStore & { findSecret: ReturnType<typeof vi.fn> } {
  return {
    deleteSecret: vi.fn(() => false),
    findSecret: vi.fn((_query: SecretQuery) => secret),
    hasSecret: vi.fn(() => secret !== undefined),
  };
}

// endregion | Helpers
