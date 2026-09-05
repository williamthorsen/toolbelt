import { describe, expect, it } from 'vitest';

import { buildKeychainStore } from '../buildKeychainStore.ts';
import type { SecurityResult, SecurityRunner } from '../runSecurity.ts';

const KEYCHAIN = '/tmp/project.keychain-db';
const QUERY = { account: 'me@example.com', service: 'atlassian-api-token' };

const SET_LINE = 'add-generic-password -U -a "me@example.com" -s "atlassian-api-token" -X 733363726574';

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

    it('names the keychain that it was built over', () => {
      const spy = createRunnerSpy({ stderr: 'password: "s3cret"\n' });

      buildKeychainStore(spy.run, KEYCHAIN).findSecret({ service: 'token' });

      expect(spy.calls[0]?.args.at(-1)).toBe(KEYCHAIN);
    });

    it('returns the secret that `security` printed', () => {
      const spy = createRunnerSpy({ stderr: 'password: 0x610962  "a\\011b"\nkeychain: "login"\n' });

      expect(buildKeychainStore(spy.run).findSecret(QUERY)).toBe('a\tb');
    });

    it('returns undefined where no item is stored', () => {
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

    it('returns false where no item is stored', () => {
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

    it('returns false where no item was there to remove', () => {
      const spy = createRunnerSpy({ exitCode: 44 });

      expect(buildKeychainStore(spy.run).deleteSecret(QUERY)).toBe(false);
    });
  });

  describe('setSecret', () => {
    it('hands the whole command to interactive mode on stdin, keeping the secret off argv', () => {
      const spy = createWriteSpy('s3cret');

      buildKeychainStore(spy.run).setSecret(QUERY, 's3cret');

      expect(spy.calls[0]).toStrictEqual({ args: ['-i'], input: `${SET_LINE}\n` });
    });

    it('names the keychain that it was built over, which the old write could not', () => {
      const spy = createWriteSpy('s3cret');

      buildKeychainStore(spy.run, KEYCHAIN).setSecret(QUERY, 's3cret');

      expect(spy.calls[0]?.input).toBe(`${SET_LINE} "${KEYCHAIN}"\n`);
    });

    it('reads the secret back, so a cut one fails at the write', () => {
      const spy = createWriteSpy('s3cret');

      buildKeychainStore(spy.run).setSecret(QUERY, 's3cret');

      expect(spy.calls[1]?.args).toStrictEqual([
        'find-generic-password',
        '-a',
        'me@example.com',
        '-s',
        'atlassian-api-token',
        '-g',
      ]);
    });

    it('throws where the stored secret differs from the one written', () => {
      const spy = createWriteSpy('s3cr');

      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, 's3cret')).toThrow(
        'The secret was written but not stored intact: 6 characters went in and 4 characters came back.',
      );
    });

    it('throws where nothing was stored at all', () => {
      const spy = createWriteSpy('s3cret', {}, { exitCode: 44 });

      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, 's3cret')).toThrow(/nothing was stored/);
    });

    it('reports a verification that could not run, so a landed write is not read as a failed one', () => {
      const spy = createWriteSpy(
        's3cret',
        {},
        {
          exitCode: 36,
          stderr: 'security: SecKeychainItemCopyContent: User interaction is not allowed.\n',
        },
      );

      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, 's3cret')).toThrow(
        /written but could not be read back to verify it.*User interaction is not allowed/s,
      );
    });

    it('carries what the failed verification reported as the cause', () => {
      const spy = createWriteSpy('s3cret', {}, { exitCode: 36, stderr: 'security: SecKeychainUnlock: locked.\n' });

      // The message names the write's outcome, so the read's own failure survives only as the cause.
      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, 's3cret')).toThrow(
        expect.objectContaining({ cause: expect.objectContaining({ message: expect.stringMatching(/locked/) }) }),
      );
    });

    it('rejects the empty secret without running anything', () => {
      const spy = createWriteSpy('');

      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, '')).toThrow(/empty/);
      expect(spy.calls).toStrictEqual([]);
    });

    it('rejects a secret too long for one command line without running anything', () => {
      const spy = createWriteSpy('');

      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, 'a'.repeat(4_096))).toThrow(/too long/);
      expect(spy.calls).toStrictEqual([]);
    });

    it('stores a secret carrying a line break, which the hexadecimal form carries', () => {
      const spy = createWriteSpy('a\nb');

      buildKeychainStore(spy.run).setSecret({ service: 'token' }, 'a\nb');

      expect(spy.calls[0]?.input).toBe('add-generic-password -U -a "" -s "token" -X 610a62\n');
    });

    it('throws what `security` reported where the write failed', () => {
      const spy = createWriteSpy('s3cret', {
        exitCode: 45,
        stderr: 'security: SecKeychainItemCreateFromContent: duplicate\n',
      });

      expect(() => buildKeychainStore(spy.run).setSecret(QUERY, 's3cret')).toThrow(/duplicate/);
    });
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

/**
 * Builds a runner for the write path, which runs twice: the write itself, then the readback that verifies it.
 * The readback returns `stored` in the hexadecimal form, the one that `security` prints for any secret.
 */
function createWriteSpy(
  stored: string,
  writeResult: Partial<SecurityResult> = {},
  readResult: Partial<SecurityResult> = {},
): RunnerSpy {
  const calls: RunnerCall[] = [];
  const printed = `password: 0x${Buffer.from(stored, 'utf8').toString('hex').toUpperCase()}  "..."\n`;

  return {
    calls,
    run: (args, input) => {
      calls.push({ args, input });

      if (args[0] === '-i') return { exitCode: 0, stderr: '', stdout: '', ...writeResult };

      return { exitCode: 0, stderr: printed, stdout: '', ...readResult };
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
