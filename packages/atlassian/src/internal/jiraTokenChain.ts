import { firstFilled } from './firstFilled.ts';
import { runTokenCommand, type TokenCommandRunner } from './runTokenCommand.ts';

export const DEFAULT_TOKEN_SERVICE = 'toolbelt.atlassian.jira';
export const TOKEN_VARIABLE = 'JIRA_API_TOKEN';

/** The sources consulted for a Jira API token, in the order that they are consulted. */
const TOKEN_SOURCES = ['supplied', 'env', 'command', 'keychain'] as const;

/**
 * Consults each source in turn, returning the first that holds something. The keychain is read through the
 * supplied function, which lets a caller reporting the source probe for presence rather than retrieve the
 * secret, and every caller shares this one ordering.
 *
 * @internal
 */
export function walkJiraTokenChain(
  options: JiraTokenChainOptions,
  readKeychain: () => string | undefined,
): JiraTokenAnswer | undefined {
  const { env = process.env, runCommand = runTokenCommand, token, tokenCommand } = options;

  const readers: Record<JiraTokenSource, () => string | undefined> = {
    command: () => (tokenCommand === undefined ? undefined : runCommand(tokenCommand)),
    env: () => env[TOKEN_VARIABLE],
    keychain: readKeychain,
    supplied: () => token,
  };

  for (const source of TOKEN_SOURCES) {
    const value = firstFilled(readers[source]());
    if (value !== undefined) return { source, value };
  }

  return undefined;
}

/** The source that answered, and what it held. */
export interface JiraTokenAnswer {
  readonly source: JiraTokenSource;
  readonly value: string;
}

/** What the chain reads before it reaches the keychain. */
export interface JiraTokenChainOptions {
  readonly env?: Record<string, string | undefined> | undefined;
  readonly runCommand?: TokenCommandRunner | undefined;
  readonly token?: string | undefined;
  readonly tokenCommand?: string | undefined;
}

export type JiraTokenSource = (typeof TOKEN_SOURCES)[number];
