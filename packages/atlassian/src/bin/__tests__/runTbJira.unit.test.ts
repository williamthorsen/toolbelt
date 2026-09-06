import { describe, expect, it } from 'vitest';

import { runTbJira } from '../runTbJira.ts';
import { createTbJiraHarness, HARNESS_VERSION } from '../test-utils/createTbJiraHarness.ts';

const EMAIL = 'someone@example.com';
const SERVICE = 'toolbelt.atlassian.jira';
const EMAIL_ENV = { JIRA_EMAIL: EMAIL };

describe(runTbJira, () => {
  describe('the root command', () => {
    it('prints the help it is asked for', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await expect(runTbJira(['--help'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toContain('Usage: tb-jira <subcommand>');
    });

    it('prints the installed version', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await expect(runTbJira(['--version'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toBe(`${HARNESS_VERSION}\n`);
    });

    it('reports a missing subcommand as a usage error', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await expect(runTbJira([], harness.effects)).resolves.toBe(2);
      expect(harness.readErrors()).toContain('A subcommand is required.');
    });

    it('distinguishes an unknown option from an unknown subcommand', async () => {
      const options = createTbJiraHarness();
      const subcommands = createTbJiraHarness();

      await runTbJira(['--nope'], options.effects);
      await runTbJira(['nope'], subcommands.effects);

      expect(options.readErrors()).toContain('Unknown option: --nope');
      expect(subcommands.readErrors()).toContain('Unknown subcommand: nope');
    });

    it('points a failing subcommand at the help of that subcommand', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await runTbJira(['auth', 'nope'], harness.effects);

      expect(harness.readErrors()).toContain('Try `tb-jira auth --help`.');
    });
  });

  describe('auth', () => {
    it('prints the help it is asked for', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await expect(runTbJira(['auth', '--help'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toContain('Usage: tb-jira auth');
    });

    it('stores a piped token under the resolved email, dropping the newline a shell adds', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, stdin: 'a-token\n' });

      await expect(runTbJira(['auth', 'set'], harness.effects)).resolves.toBe(0);
      expect(harness.stored()).toStrictEqual({ [`${EMAIL}|${SERVICE}`]: 'a-token' });
    });

    it('prompts for a token at a terminal rather than reading stdin', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, isTty: true, prompted: 'typed-token' });

      await runTbJira(['auth', 'set'], harness.effects);

      expect(harness.stored()).toStrictEqual({ [`${EMAIL}|${SERVICE}`]: 'typed-token' });
    });

    it('stores under the email and service it is given', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, stdin: 'a-token' });

      await runTbJira(['auth', 'set', '--email', 'other@example.com', '--service', 'custom'], harness.effects);

      expect(harness.stored()).toStrictEqual({ 'other@example.com|custom': 'a-token' });
    });

    it('removes a stored token', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, stored: { [`${EMAIL}|${SERVICE}`]: 'a-token' } });

      await expect(runTbJira(['auth', 'delete'], harness.effects)).resolves.toBe(0);
      expect(harness.stored()).toStrictEqual({});
    });

    it('exits 1 where there was no token to remove', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await expect(runTbJira(['auth', 'delete'], harness.effects)).resolves.toBe(1);
    });

    it('reports the keychain as the source, without reading the token', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, stored: { [`${EMAIL}|${SERVICE}`]: 'a-token' } });

      await expect(runTbJira(['auth', 'status'], harness.effects)).resolves.toBe(0);
      expect(harness.readOutput()).toContain('would come from the macOS keychain');
      expect(harness.readOutput()).not.toContain('a-token');
      expect(harness.secretReads()).toBe(0);
    });

    it('reports the environment ahead of the keychain', async () => {
      const harness = createTbJiraHarness({
        env: { JIRA_API_TOKEN: 'from-env', JIRA_EMAIL: EMAIL },
        stored: { [`${EMAIL}|${SERVICE}`]: 'a-token' },
      });

      await runTbJira(['auth', 'status'], harness.effects);

      expect(harness.readOutput()).toContain('the JIRA_API_TOKEN environment variable');
    });

    it('exits 1 where no source would answer', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV });

      await expect(runTbJira(['auth', 'status'], harness.effects)).resolves.toBe(1);
      expect(harness.readOutput()).toContain('No token would be found');
    });

    it('reports a token the keychain cannot carry as a usage error, not an unreachable keychain', async () => {
      // A token too long for `security`'s command line reaches the store and is refused there, which is the
      // case the blank guard above does not cover.
      const harness = createTbJiraHarness({
        env: EMAIL_ENV,
        stdin: 'a'.repeat(4_096),
        unstorable: 'The secret is too long to store.',
      });

      await expect(runTbJira(['auth', 'set'], harness.effects)).resolves.toBe(2);
      expect(harness.readErrors()).toContain('The secret is too long to store.');
    });

    it('refuses a blank token, which the resolver would drop and status would still report', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, stdin: '   \n' });

      await expect(runTbJira(['auth', 'set'], harness.effects)).resolves.toBe(2);
      expect(harness.readErrors()).toContain('The token is blank.');
      expect(harness.stored()).toStrictEqual({});
    });

    it('reports an unreachable keychain as its own exit code', async () => {
      const harness = createTbJiraHarness({ env: EMAIL_ENV, keystoreFault: 'the keychain is locked' });

      await expect(runTbJira(['auth', 'delete'], harness.effects)).resolves.toBe(3);
      expect(harness.readErrors()).toContain('the keychain is locked');
    });

    it('reports a missing email as a usage error', async () => {
      const harness = createTbJiraHarness({ env: {} });

      await expect(runTbJira(['auth', 'status'], harness.effects)).resolves.toBe(2);
      expect(harness.readErrors()).toContain('No Atlassian account email was given');
    });
  });
});
