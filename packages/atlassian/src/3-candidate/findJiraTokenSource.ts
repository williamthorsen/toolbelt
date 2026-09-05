import { createKeychainStore } from '@williamthorsen/toolbelt.secrets/candidate';

import { DEFAULT_TOKEN_SERVICE, type JiraTokenSource, walkJiraTokenChain } from '../internal/jiraTokenChain.ts';
import type { JiraTokenOptions } from './resolveJiraToken.ts';

/** Stands in for the token at the keychain link, which this never reads. */
const STORED = 'stored';

/**
 * Reports which source would supply the Jira API token, walking the same chain `resolveJiraToken` walks and
 * answering `undefined` where every source misses. The token itself is never read: the keychain is probed for
 * presence, which raises no keychain access prompt. A configured token command does run, and its output is
 * discarded.
 *
 * Presence is not contents. A keychain item holding only whitespace answers here and is dropped by
 * `resolveJiraToken`, which reads the value and treats a blank one as a miss.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function findJiraTokenSource(options: JiraTokenOptions): JiraTokenSource | undefined {
  const { account, service = DEFAULT_TOKEN_SERVICE, store } = options;

  const answer = walkJiraTokenChain(options, () =>
    (store ?? createKeychainStore()).hasSecret({ account, service }) ? STORED : undefined,
  );

  return answer?.source;
}

export type { JiraTokenSource } from '../internal/jiraTokenChain.ts';
