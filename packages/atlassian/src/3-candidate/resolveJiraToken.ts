import { createKeychainStore, type SecretStore } from '@williamthorsen/toolbelt.secrets/candidate';

import { firstFilled } from '../internal/firstFilled.ts';
import { runTokenCommand, type TokenCommandRunner } from '../internal/runTokenCommand.ts';

const DEFAULT_SERVICE = 'toolbelt.atlassian.jira';
const TOKEN_VARIABLE = 'JIRA_API_TOKEN';

/**
 * Resolves the Jira API token from a supplied value, then the environment, then a configured command, then the
 * keychain. A token is stored per account, so `account` is the email that Basic auth pairs it with. Throws
 * naming the command that stores one where every source misses.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function resolveJiraToken(options: JiraTokenOptions): string {
  const {
    account,
    env = process.env,
    runCommand = runTokenCommand,
    service = DEFAULT_SERVICE,
    store,
    token,
    tokenCommand,
  } = options;

  const supplied = firstFilled(token, env[TOKEN_VARIABLE]);
  if (supplied !== undefined) return supplied;

  const fromCommand = tokenCommand === undefined ? undefined : firstFilled(runCommand(tokenCommand));
  if (fromCommand !== undefined) return fromCommand;

  // The store is opened only here: `createKeychainStore` throws off macOS, where the sources above still work.
  const fromStore = firstFilled((store ?? createKeychainStore()).findSecret({ account, service }));
  if (fromStore !== undefined) return fromStore;

  throw new Error(
    `No Jira API token was found for '${account}'. Supply one, set ${TOKEN_VARIABLE}, or store one: tb-secret set ${service} --account ${account}`,
  );
}

export interface JiraTokenOptions {
  /** The Atlassian account email, which names the keychain account holding the token. */
  readonly account: string;
  readonly env?: Record<string, string | undefined> | undefined;
  readonly runCommand?: TokenCommandRunner | undefined;
  /** The keychain service holding the token. A scoped token authenticates one product, so this defaults per product. */
  readonly service?: string | undefined;
  readonly store?: SecretStore | undefined;
  /** Takes precedence over every other source, so a caller that read one from its own surface passes it here. */
  readonly token?: string | undefined;
  /** A shell line that prints the token, consulted after the environment and before the keychain. */
  readonly tokenCommand?: string | undefined;
}
