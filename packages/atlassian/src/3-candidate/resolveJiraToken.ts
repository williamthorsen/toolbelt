import { createKeychainStore, type SecretStore } from '@williamthorsen/toolbelt.secrets/candidate';

import {
  DEFAULT_TOKEN_SERVICE,
  type JiraTokenChainOptions,
  TOKEN_VARIABLE,
  walkJiraTokenChain,
} from '../internal/jiraTokenChain.ts';

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
  const { account, service = DEFAULT_TOKEN_SERVICE, store } = options;

  // The store is opened only inside the reader: `createKeychainStore` throws off macOS, where the earlier
  // sources still work.
  const answer = walkJiraTokenChain(options, () => (store ?? createKeychainStore()).findSecret({ account, service }));

  if (answer === undefined) {
    throw new Error(
      `No Jira API token was found for '${account}'. Supply one, set ${TOKEN_VARIABLE}, or store one: tb-secret set ${service} --account ${account}`,
    );
  }

  return answer.value;
}

export interface JiraTokenOptions extends JiraTokenChainOptions {
  /** The Atlassian account email, which names the keychain account holding the token. */
  readonly account: string;
  /** The keychain service holding the token. A scoped token authenticates one product, so this defaults per product. */
  readonly service?: string | undefined;
  readonly store?: SecretStore | undefined;
}
