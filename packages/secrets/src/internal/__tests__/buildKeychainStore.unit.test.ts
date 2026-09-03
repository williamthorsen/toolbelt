import { describe, expect, it } from 'vitest';

import { buildKeychainStore, buildWritableKeychainStore } from '../buildKeychainStore.ts';
import type { SecurityResult, SecurityRunner } from '../runSecurity.ts';

const KEYCHAIN = '/tmp/project.keychain-db';
const QUERY = { account: 'me@example.com', service: 'atlassian-api-token' };

describe(buildKeychainStore, () => {
  describe('findSecret', () => {
    it('names the item and asks for the secret', () => {
      const spy = createRunnerSpy({ stderr: 'password: "s3cret"\n' });

      buildKeychainStore(spy.run).findSecret(QUERY);

      expect(spy.calls).toStrictEqual([
        {
          args: ['find-generic-password', '-a', 'me@example.com', '-s', 'atlassian-api-token', '-g'],
          input: undefined,
        },
      ]);
    });

    it('carries the empty account where the query names none', () => {
      const spy = createRunnerSpy({ stderr: 'password: "s3cret"\n' });

      buildKeychainStore(spy.run).findSecret({ service: 'token' });

      expect(spy.calls[0]?.args).toStrictEqual(['find-generic-password', '-a', '', '-s', 'token', '-g']);
    });

    it('names the keychain it was built over', () => {
      const spy = createRunnerSpy({ stderr: 'password: "s3cret"\n' });

      buildKeychainStore(spy.run, KEYCHAIN).findSecret({ service: 'token' });

      expect(spy.calls[0]?.args.at(-1)).toBe(KEYCHAIN);
    });

    it('returns the secret that `security` printed', () => {
      const spy = createRunnerSpy({ stderr: 'password: 0x610962  "a\\011b"\nkeychain: "login"\n' });

      expect(buildKeychainStore(spy.run).findSecret(QUERY)).toBe('a\tb');
    });

    it('answers undefined where no item is stored', () => {
      const spy = createRunnerSpy({ exitCode: 44, stderr: 'security: SecKeychainSearchCopyNext: not found\n' });

      expect(buildKeychainStore(spy.run).findSecret(QUERY)).toBeUndefined();
    });

    it('throws where the keystore could not be reached, which is not absence', () => {
      const spy = createRunnerSpy({
        exitCode: 36,
        stderr: 'security: SecKeychainUnlock: User interaction is not allowed.\n',
      });

      expect(() => buildKeychainStore(spy.run).findSecret(QUERY)).toThrow(/User interaction is not allowed/);
    });
  });

  describe('hasSecret', () => {
    it('omits -g, so the secret is never retrieved', () => {
      const spy = createRunnerSpy();

      expect(buildKeychainStore(spy.run).hasSecret(QUERY)).toBe(true);
      expect(spy.calls[0]?.args).toStrictEqual([
        'find-generic-password',
        '-a',
        'me@example.com',
        '-s',
        'atlassian-api-token',
      ]);
    });

    it('answers false where no item is stored', () => {
      const spy = createRunnerSpy({ exitCode: 44 });

      expect(buildKeychainStore(spy.run).hasSecret(QUERY)).toBe(false);
    });
  });

  describe('deleteSecret', () => {
    it('reports the removal', () => {
      const spy = createRunnerSpy();

      expect(buildKeychainStore(spy.run, KEYCHAIN).deleteSecret(QUERY)).toBe(true);
      expect(spy.calls[0]?.args).toStrictEqual([
        'delete-generic-password',
        '-a',
        'me@example.com',
        '-s',
        'atlassian-api-token',
        KEYCHAIN,
      ]);
    });

    it('answers false where no item was there to remove', () => {
      const spy = createRunnerSpy({ exitCode: 44 });

      expect(buildKeychainStore(spy.run).deleteSecret(QUERY)).toBe(false);
    });
  });

  it('holds no write, since a named keychain cannot be written to safely', () => {
    expect('setSecret' in buildKeychainStore(createRunnerSpy().run, KEYCHAIN)).toBe(false);
  });
});

describe(buildWritableKeychainStore, () => {
  it('ends the arguments with -w and writes the secret twice to stdin', () => {
    const spy = createRunnerSpy();

    buildWritableKeychainStore(spy.run).setSecret(QUERY, 's3cret');

    expect(spy.calls).toStrictEqual([
      {
        args: ['add-generic-password', '-U', '-a', 'me@example.com', '-s', 'atlassian-api-token', '-w'],
        input: 's3cret\ns3cret\n',
      },
    ]);
  });

  it('rejects a secret `security` would store truncated, without running it', () => {
    const spy = createRunnerSpy();

    expect(() => buildWritableKeychainStore(spy.run).setSecret(QUERY, 'first\nsecond')).toThrow(/line break/);
    expect(() => buildWritableKeychainStore(spy.run).setSecret(QUERY, '')).toThrow(/empty/);
    expect(spy.calls).toStrictEqual([]);
  });

  it('throws what `security` reported where the write failed', () => {
    const spy = createRunnerSpy({ exitCode: 45, stderr: 'security: SecKeychainItemCreateFromContent: duplicate\n' });

    expect(() => buildWritableKeychainStore(spy.run).setSecret(QUERY, 's3cret')).toThrow(/duplicate/);
  });
});

// region | Helpers

/** Builds a runner that answers every call the same way and records what it was asked to run. */
function createRunnerSpy(result: Partial<SecurityResult> = {}): RunnerSpy {
  const calls: RunnerCall[] = [];

  return {
    calls,
    run: (args, input) => {
      calls.push({ args, input });

      return { exitCode: 0, stderr: '', stdout: '', ...result };
    },
  };
}

interface RunnerCall {
  args: string[];
  input: string | undefined;
}

interface RunnerSpy {
  calls: RunnerCall[];
  run: SecurityRunner;
}

// endregion | Helpers
