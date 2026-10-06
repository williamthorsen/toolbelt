import { describe, expect, it } from 'vitest';

import type { SecretQuery, WritableSecretStore } from '../../3-candidate/SecretStore.ts';
import { UnstorableSecretError } from '../../3-candidate/UnstorableSecretError.ts';
import { runTbSecret, type TbSecretEffects } from '../runTbSecret.ts';

const KEYCHAIN = '/tmp/project.keychain-db';
const VERSION = '9.9.9';

describe(runTbSecret, () => {
  describe('get', () => {
    it('prints the secret stored under the service', async () => {
      const harness = createHarness({ stored: { 'default||token': 's3cret' } });

      await expect(runTbSecret(['get', 'token'], harness.effects)).resolves.toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: 's3cret\n',
      });
    });

    it('reads the account named by --account', async () => {
      const harness = createHarness({ stored: { 'default|me@example.com|token': 'mine' } });

      const result = await runTbSecret(['get', 'token', '--account', 'me@example.com'], harness.effects);

      expect(result.stdout).toBe('mine\n');
    });

    it('reads the keychain named by --keychain', async () => {
      const harness = createHarness({ stored: { [`${KEYCHAIN}||token`]: 'elsewhere' } });

      const result = await runTbSecret(['get', 'token', '--keychain', KEYCHAIN], harness.effects);

      expect(result.stdout).toBe('elsewhere\n');
    });

    it('exits 1 printing nothing when no secret is stored', async () => {
      await expect(runTbSecret(['get', 'token'], createHarness().effects)).resolves.toStrictEqual({
        exitCode: 1,
        stderr: '',
        stdout: '',
      });
    });
  });

  describe('has', () => {
    it('exits 0 printing nothing when a secret is stored', async () => {
      const harness = createHarness({ stored: { 'default||token': 's3cret' } });

      await expect(runTbSecret(['has', 'token'], harness.effects)).resolves.toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: '',
      });
    });

    it('exits 1 when none is', async () => {
      expect((await runTbSecret(['has', 'token'], createHarness().effects)).exitCode).toBe(1);
    });
  });

  describe('delete', () => {
    it('removes the secret', async () => {
      const harness = createHarness({ stored: { 'default||token': 's3cret' } });

      expect((await runTbSecret(['delete', 'token'], harness.effects)).exitCode).toBe(0);
      expect(harness.secrets.has('default||token')).toBe(false);
    });

    it('exits 1 when none was there to remove', async () => {
      expect((await runTbSecret(['delete', 'token'], createHarness().effects)).exitCode).toBe(1);
    });
  });

  describe('set', () => {
    it('stores what arrives on stdin', async () => {
      const harness = createHarness({ stdin: 's3cret' });

      await expect(runTbSecret(['set', 'token'], harness.effects)).resolves.toStrictEqual({
        exitCode: 0,
        stderr: '',
        stdout: '',
      });
      expect(harness.secrets.get('default||token')).toBe('s3cret');
    });

    it('drops the newline that a shell adds to a piped secret', async () => {
      const harness = createHarness({ stdin: 's3cret\n' });

      await runTbSecret(['set', 'token', '--account', 'me@example.com'], harness.effects);

      expect(harness.secrets.get('default|me@example.com|token')).toBe('s3cret');
    });

    it('stores a secret that contains a line break, which the keychain stores faithfully', async () => {
      const harness = createHarness({ stdin: 'first\nsecond' });

      expect((await runTbSecret(['set', 'token'], harness.effects)).exitCode).toBe(0);
      expect(harness.secrets.get('default||token')).toBe('first\nsecond');
    });

    it('prompts at a terminal and stores what was typed', async () => {
      const harness = createHarness({ promptAnswer: 'typed', tty: true });

      expect((await runTbSecret(['set', 'token'], harness.effects)).exitCode).toBe(0);
      expect(harness.secrets.get('default||token')).toBe('typed');
    });

    it('reports a prompt abandoned by the typist', async () => {
      const harness = createHarness({ promptFailure: 'The two entries differ. Nothing was stored.', tty: true });

      const result = await runTbSecret(['set', 'token'], harness.effects);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/The two entries differ/);
      expect(harness.secrets.size).toBe(0);
    });

    it('reports an unreachable keychain before a secret is typed into this process', async () => {
      const harness = createHarness({ failure: 'A keychain store needs macOS. This platform is linux.', tty: true });

      const result = await runTbSecret(['set', 'token'], harness.effects);

      expect(result.exitCode).toBe(3);
      expect(harness.state.prompted).toBe(false);
    });

    it('writes to the keychain named by --keychain', async () => {
      const harness = createHarness({ stdin: 's3cret' });

      expect((await runTbSecret(['set', 'token', '--keychain', KEYCHAIN], harness.effects)).exitCode).toBe(0);
      expect(harness.secrets.get(`${KEYCHAIN}||token`)).toBe('s3cret');
    });

    it('exits 2 on a secret that the keychain cannot store, rather than 3', async () => {
      const harness = createHarness({ stdin: '' });

      const result = await runTbSecret(['set', 'token'], harness.effects);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(/empty/);
      expect(harness.secrets.size).toBe(0);
    });
  });

  describe('usage', () => {
    it.each([
      { args: [], message: /Error: A command is required\./ },
      { args: ['sniff', 'token'], message: /Error: Unknown command: sniff/ },
      { args: ['--sniff'], message: /Error: Unknown option: --sniff/ },
      { args: ['get'], message: /Error: Missing argument: <service>/ },
      { args: ['get', ''], message: /Error: The service name is empty\./ },
      { args: ['get', 'token', 'extra'], message: /Error: Unexpected positional argument: extra/ },
    ])('exits 2 on $args', async ({ args, message }) => {
      const result = await runTbSecret(args, createHarness().effects);

      expect(result.exitCode).toBe(2);
      expect(result.stderr).toMatch(message);
    });

    it('points at the subcommand’s own help when one was named', async () => {
      const result = await runTbSecret(['get'], createHarness().effects);

      expect(result.stderr).toMatch(/Try 'tb-secret get --help'\./);
    });

    it('suggests the closest command for a near miss', async () => {
      const result = await runTbSecret(['gt', 'token'], createHarness().effects);

      expect(result.stderr).toContain("Did you mean 'get'?");
    });
  });

  describe('help and version', () => {
    it.each([['--help'], ['-h']])('prints the root help under %s', async (flag) => {
      const result = await runTbSecret([flag], createHarness().effects);

      expect(result.stdout).toMatch(/Usage: tb-secret \[options\] <command>/);
      expect(result.stdout).toContain('Exit codes:');
    });

    it.each([['delete'], ['get'], ['has'], ['set']])('prints the help of %s', async (subcommand) => {
      const result = await runTbSecret([subcommand, '--help'], createHarness().effects);

      expect(result.stdout).toMatch(new RegExp(String.raw`Usage: tb-secret ${subcommand} \[options\] <service>`));
    });

    it.each([['--version'], ['-V']])('prints the installed version under %s', async (flag) => {
      const result = await runTbSecret([flag], createHarness().effects);

      expect(result.stdout).toBe(`${VERSION}\n`);
    });
  });

  it('exits 3 when the keychain could not be reached, which is not an absent secret', async () => {
    const harness = createHarness({ failure: 'A keychain store needs macOS. This platform is linux.' });

    const result = await runTbSecret(['get', 'token'], harness.effects);

    expect(result.exitCode).toBe(3);
    expect(result.stderr).toBe('A keychain store needs macOS. This platform is linux.\n');
  });
});

// region | Helpers

/**
 * Builds effects over a map of secrets keyed by keychain, account, and service, so that a test reads back which key a
 * command touched.
 */
function createHarness(options: HarnessOptions = {}): Harness {
  const { failure, promptAnswer = '', promptFailure, stdin = '', stored = {}, tty = false } = options;
  const secrets = new Map(Object.entries(stored));
  const state = { prompted: false };

  return {
    effects: {
      createStore: (keychain): WritableSecretStore => {
        if (failure !== undefined) throw new Error(failure);

        return {
          deleteSecret: (query) => secrets.delete(buildKey(query, keychain)),
          findSecret: (query) => secrets.get(buildKey(query, keychain)),
          hasSecret: (query) => secrets.has(buildKey(query, keychain)),
          setSecret: (query, secret) => {
            if (secret === '') throw new UnstorableSecretError('The secret is empty.');

            secrets.set(buildKey(query, keychain), secret);
          },
        };
      },
      isStdinTty: () => tty,
      promptSecret: () => {
        state.prompted = true;

        return promptFailure === undefined ? Promise.resolve(promptAnswer) : Promise.reject(new Error(promptFailure));
      },
      readStdin: () => Promise.resolve(stdin),
      resolveVersion: () => VERSION,
    },
    secrets,
    state,
  };
}

/** Renders the key under which one item is stored, which a wrong keychain or account fails to match. */
function buildKey({ account = '', service }: SecretQuery, keychain: string | undefined): string {
  return `${keychain ?? 'default'}|${account}|${service}`;
}

interface Harness {
  effects: TbSecretEffects;
  secrets: Map<string, string>;
  /** What the effects recorded, which is how a test sees that the command never prompted. */
  state: { prompted: boolean };
}

interface HarnessOptions {
  failure?: string;
  promptAnswer?: string;
  promptFailure?: string;
  stdin?: string;
  stored?: Record<string, string>;
  tty?: boolean;
}

// endregion | Helpers
