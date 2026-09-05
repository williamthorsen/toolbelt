import type { SecretQuery, WritableSecretStore } from '@williamthorsen/toolbelt.secrets/candidate';
import { describe, expect, it, vi } from 'vitest';

import { runTbJira } from '../runTbJira.ts';
import type { TbJiraEffects } from '../subcommand-support.ts';

const EMAIL = 'someone@example.com';
const SERVICE = 'toolbelt.atlassian.jira';
const VERSION = '9.9.9';

describe(runTbJira, () => {
  describe('the root command', () => {
    it('prints the help it is asked for', async () => {
      const harness = createHarness();

      await expect(runTbJira(['--help'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toContain('Usage: tb-jira <subcommand>');
    });

    it('prints the installed version', async () => {
      const harness = createHarness();

      await expect(runTbJira(['--version'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toBe(`${VERSION}\n`);
    });

    it('reports a missing subcommand as a usage error', async () => {
      const harness = createHarness();

      await expect(runTbJira([], harness.effects)).resolves.toBe(2);
      expect(harness.readErrors()).toContain('A subcommand is required.');
    });

    it('distinguishes an unknown option from an unknown subcommand', async () => {
      const options = createHarness();
      const subcommands = createHarness();

      await runTbJira(['--nope'], options.effects);
      await runTbJira(['nope'], subcommands.effects);

      expect(options.readErrors()).toContain('Unknown option: --nope');
      expect(subcommands.readErrors()).toContain('Unknown subcommand: nope');
    });

    it('points a failing subcommand at the help of that subcommand', async () => {
      const harness = createHarness();

      await runTbJira(['auth', 'nope'], harness.effects);

      expect(harness.readErrors()).toContain('Try `tb-jira auth --help`.');
    });
  });

  describe('auth', () => {
    it('prints the help it is asked for', async () => {
      const harness = createHarness();

      await expect(runTbJira(['auth', '--help'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toContain('Usage: tb-jira auth');
    });

    it('stores a piped token under the resolved email, dropping the newline a shell adds', async () => {
      const harness = createHarness({ stdin: 'a-token\n' });

      await expect(runTbJira(['auth', 'set'], harness.effects)).resolves.toBe(0);
      expect(harness.stored()).toStrictEqual({ [`${EMAIL}|${SERVICE}`]: 'a-token' });
    });

    it('prompts for a token at a terminal rather than reading stdin', async () => {
      const harness = createHarness({ isTty: true, prompted: 'typed-token' });

      await runTbJira(['auth', 'set'], harness.effects);

      expect(harness.stored()).toStrictEqual({ [`${EMAIL}|${SERVICE}`]: 'typed-token' });
    });

    it('stores under the email and service it is given', async () => {
      const harness = createHarness({ stdin: 'a-token' });

      await runTbJira(['auth', 'set', '--email', 'other@example.com', '--service', 'custom'], harness.effects);

      expect(harness.stored()).toStrictEqual({ 'other@example.com|custom': 'a-token' });
    });

    it('removes a stored token', async () => {
      const harness = createHarness({ stored: { [`${EMAIL}|${SERVICE}`]: 'a-token' } });

      await expect(runTbJira(['auth', 'delete'], harness.effects)).resolves.toBe(0);
      expect(harness.stored()).toStrictEqual({});
    });

    it('exits 1 where there was no token to remove', async () => {
      const harness = createHarness();

      await expect(runTbJira(['auth', 'delete'], harness.effects)).resolves.toBe(1);
    });

    it('reports the keychain as the source, without reading the token', async () => {
      const harness = createHarness({ stored: { [`${EMAIL}|${SERVICE}`]: 'a-token' } });

      await expect(runTbJira(['auth', 'status'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toContain('would come from the macOS keychain');
      expect(harness.readOutput()).not.toContain('a-token');
      expect(harness.findSecret).not.toHaveBeenCalled();
    });

    it('reports the environment ahead of the keychain', async () => {
      const harness = createHarness({
        env: { JIRA_API_TOKEN: 'from-env', JIRA_EMAIL: EMAIL },
        stored: { [`${EMAIL}|${SERVICE}`]: 'a-token' },
      });

      await runTbJira(['auth', 'status'], harness.effects);

      expect(harness.readOutput()).toContain('the JIRA_API_TOKEN environment variable');
    });

    it('exits 1 where no source would answer', async () => {
      const harness = createHarness();

      await expect(runTbJira(['auth', 'status'], harness.effects)).resolves.toBe(1);
      expect(harness.readOutput()).toContain('No token would be found');
    });

    it('reports an unreachable keychain as its own exit code', async () => {
      const harness = createHarness({ keystoreFault: 'the keychain is locked' });

      await expect(runTbJira(['auth', 'delete'], harness.effects)).resolves.toBe(3);
      expect(harness.readErrors()).toContain('the keychain is locked');
    });

    it('reports a missing email as a usage error', async () => {
      const harness = createHarness({ env: {} });

      await expect(runTbJira(['auth', 'status'], harness.effects)).resolves.toBe(2);
      expect(harness.readErrors()).toContain('No Atlassian account email was given');
    });
  });
});

// region | Helpers

/** Builds a runner harness over an in-memory keychain, collecting what the run writes to each stream. */
function createHarness(options: HarnessOptions = {}): Harness {
  const { env = { JIRA_EMAIL: EMAIL }, isTty = false, keystoreFault, prompted = '', stdin = '', stored = {} } = options;

  const secrets = new Map(Object.entries(stored));
  const output: string[] = [];
  const errors: string[] = [];

  const refuse = (): never => {
    throw new Error(keystoreFault);
  };
  const key = (query: SecretQuery): string => `${query.account ?? ''}|${query.service}`;

  const findSecret = vi.fn((query: SecretQuery) => secrets.get(key(query)));
  const store: WritableSecretStore = {
    deleteSecret: (query) => (keystoreFault === undefined ? secrets.delete(key(query)) : refuse()),
    findSecret,
    hasSecret: (query) => (keystoreFault === undefined ? secrets.has(key(query)) : refuse()),
    setSecret: (query, secret) => void (keystoreFault === undefined ? secrets.set(key(query), secret) : refuse()),
  };

  return {
    effects: {
      createStore: () => store,
      env,
      isStdinTty: () => isTty,
      promptSecret: () => Promise.resolve(prompted),
      readStdin: () => stdin,
      resolveVersion: () => VERSION,
      write: (text) => void output.push(text),
      writeError: (text) => void errors.push(text),
    },
    findSecret,
    readErrors: () => errors.join(''),
    readOutput: () => output.join(''),
    stored: () => Object.fromEntries(secrets),
  };
}

interface Harness {
  effects: TbJiraEffects;
  findSecret: ReturnType<typeof vi.fn>;
  readErrors: () => string;
  readOutput: () => string;
  stored: () => Record<string, string>;
}

interface HarnessOptions {
  env?: Record<string, string | undefined>;
  isTty?: boolean;
  /** Makes every keychain call throw, which is how an unreachable keychain is exercised. */
  keystoreFault?: string;
  prompted?: string;
  stdin?: string;
  stored?: Record<string, string>;
}

// endregion | Helpers
