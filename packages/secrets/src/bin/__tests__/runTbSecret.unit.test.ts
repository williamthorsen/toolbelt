import { describe, expect, it } from 'vitest';

import type { SecretQuery, SecretStore, WritableSecretStore } from '../../3-candidate/SecretStore.ts';
import { runTbSecret, type TbSecretEffects } from '../runTbSecret.ts';

const KEYCHAIN = '/tmp/project.keychain-db';
const VERSION = '9.9.9';

describe(runTbSecret, () => {
  describe('get', () => {
    it('prints the secret stored under the service', () => {
      const harness = createHarness({ stored: { 'default||token': 's3cret' } });

      expect(runTbSecret(['get', 'token'], harness.effects)).toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: 's3cret\n',
      });
    });

    it('reads the account named by --account', () => {
      const harness = createHarness({ stored: { 'default|me@example.com|token': 'mine' } });

      expect(runTbSecret(['get', 'token', '--account', 'me@example.com'], harness.effects).stdout).toBe('mine\n');
    });

    it('reads the keychain named by --keychain', () => {
      const harness = createHarness({ stored: { [`${KEYCHAIN}||token`]: 'elsewhere' } });

      expect(runTbSecret(['get', 'token', '--keychain', KEYCHAIN], harness.effects).stdout).toBe('elsewhere\n');
    });

    it('exits 1 printing nothing where no secret is stored', () => {
      expect(runTbSecret(['get', 'token'], createHarness().effects)).toStrictEqual({
        exitCode: 1,
        stderr: '',
        stdout: '',
      });
    });
  });

  describe('has', () => {
    it('exits 0 printing nothing where a secret is stored', () => {
      const harness = createHarness({ stored: { 'default||token': 's3cret' } });

      expect(runTbSecret(['has', 'token'], harness.effects)).toStrictEqual({ exitCode: 0, stderr: '', stdout: '' });
    });

    it('exits 1 where none is', () => {
      expect(runTbSecret(['has', 'token'], createHarness().effects).exitCode).toBe(1);
    });
  });

  describe('delete', () => {
    it('removes the secret', () => {
      const harness = createHarness({ stored: { 'default||token': 's3cret' } });

      expect(runTbSecret(['delete', 'token'], harness.effects).exitCode).toBe(0);
      expect(harness.secrets.has('default||token')).toBe(false);
    });

    it('exits 1 where none was there to remove', () => {
      expect(runTbSecret(['delete', 'token'], createHarness().effects).exitCode).toBe(1);
    });
  });

  describe('set', () => {
    it('stores what arrives on stdin', () => {
      const harness = createHarness({ stdin: 's3cret' });

      expect(runTbSecret(['set', 'token'], harness.effects)).toStrictEqual({ exitCode: 0, stderr: '', stdout: '' });
      expect(harness.secrets.get('default||token')).toBe('s3cret');
    });

    it('drops the newline a shell adds to a piped secret', () => {
      const harness = createHarness({ stdin: 's3cret\n' });

      runTbSecret(['set', 'token', '--account', 'me@example.com'], harness.effects);

      expect(harness.secrets.get('default|me@example.com|token')).toBe('s3cret');
    });

    it('hands the prompt to `security` at a terminal, storing nothing itself', () => {
      const harness = createHarness({ tty: true });

      expect(runTbSecret(['set', 'token'], harness.effects).exitCode).toBe(0);
      expect(harness.prompts).toStrictEqual([{ account: undefined, service: 'token' }]);
      expect(harness.secrets.size).toBe(0);
    });

    it('reports a prompt `security` abandoned', () => {
      const harness = createHarness({ promptExitCode: 1, tty: true });

      const result = runTbSecret(['set', 'token'], harness.effects);

      expect(result.exitCode).toBe(3);
      expect(result.stderr).toMatch(/exited 1 without storing/);
    });

    it('rejects --keychain, naming the keychain a write lands in', () => {
      const result = runTbSecret(['set', 'token', '--keychain', KEYCHAIN], createHarness().effects);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/only in the default keychain/);
    });

    it.each([
      { label: 'empty', message: /empty/, stdin: '' },
      { label: 'multi-line', message: /line break/, stdin: 'first\nsecond' },
    ])('rejects a $label secret before reaching the keychain', ({ message, stdin }) => {
      const harness = createHarness({ stdin });

      const result = runTbSecret(['set', 'token'], harness.effects);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(message);
      expect(harness.secrets.size).toBe(0);
    });
  });

  describe('usage', () => {
    it.each([
      { args: [], message: /A subcommand is required\./ },
      { args: ['sniff', 'token'], message: /Unknown subcommand: sniff/ },
      { args: ['--sniff'], message: /Unknown option: --sniff/ },
      { args: ['get'], message: /A service name is required\./ },
      { args: ['get', ''], message: /The service name is empty\./ },
      { args: ['get', 'token', 'extra'], message: /Expected one service name\. Received 2\./ },
    ])('exits 2 on $args', ({ args, message }) => {
      const result = runTbSecret(args, createHarness().effects);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(message);
    });

    it('points at the subcommand’s own help where one was named', () => {
      expect(runTbSecret(['get'], createHarness().effects).stderr).toMatch(/Try `tb-secret get --help`\./);
    });
  });

  describe('help and version', () => {
    it.each([['--help'], ['-h']])('prints the root help under %s', (flag) => {
      expect(runTbSecret([flag], createHarness().effects).stdout).toMatch(/Usage: tb-secret <subcommand>/);
    });

    it.each([['delete'], ['get'], ['has'], ['set']])('prints the help of %s', (subcommand) => {
      const stdout = runTbSecret([subcommand, '--help'], createHarness().effects).stdout;

      expect(stdout).toMatch(new RegExp(`Usage: tb-secret ${subcommand} <service>`));
    });

    it('prints the installed version', () => {
      expect(runTbSecret(['--version'], createHarness().effects).stdout).toBe(`${VERSION}\n`);
    });
  });

  it('exits 3 where the keychain could not be reached, which is not an absent secret', () => {
    const harness = createHarness({ failure: 'A keychain store needs macOS. This platform is linux.' });

    const result = runTbSecret(['get', 'token'], harness.effects);

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toBe('A keychain store needs macOS. This platform is linux.\n');
  });
});

// region | Helpers

/**
 * Builds effects over a map of secrets keyed by keychain, account, and service, so a command's reach is read
 * back from which key it touched.
 */
function createHarness(options: HarnessOptions = {}): Harness {
  const { failure, promptExitCode = 0, stdin = '', stored = {}, tty = false } = options;
  const prompts: SecretQuery[] = [];
  const secrets = new Map(Object.entries(stored));

  function openStore(keychain: string | undefined): WritableSecretStore {
    if (failure !== undefined) throw new Error(failure);

    return {
      deleteSecret: (query) => secrets.delete(buildKey(query, keychain)),
      findSecret: (query) => secrets.get(buildKey(query, keychain)),
      hasSecret: (query) => secrets.has(buildKey(query, keychain)),
      setSecret: (query, secret) => void secrets.set(buildKey(query, keychain), secret),
    };
  }

  return {
    effects: {
      createStore: (keychain): SecretStore => openStore(keychain),
      createWritableStore: () => openStore(undefined),
      isStdinTty: () => tty,
      promptSecret: (query) => {
        prompts.push(query);

        return promptExitCode;
      },
      readStdin: () => stdin,
      resolveVersion: () => VERSION,
    },
    prompts,
    secrets,
  };
}

/** Renders the key one item is held under, which is what a wrong keychain or account fails to match. */
function buildKey({ account = '', service }: SecretQuery, keychain: string | undefined): string {
  return `${keychain ?? 'default'}|${account}|${service}`;
}

interface Harness {
  effects: TbSecretEffects;
  prompts: SecretQuery[];
  secrets: Map<string, string>;
}

interface HarnessOptions {
  failure?: string;
  promptExitCode?: number;
  stdin?: string;
  stored?: Record<string, string>;
  tty?: boolean;
}

// endregion | Helpers
