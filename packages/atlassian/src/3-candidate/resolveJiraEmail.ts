import { firstFilled } from '../internal/firstFilled.ts';

const EMAIL_VARIABLE = 'JIRA_EMAIL';

/**
 * Resolves the email that Basic auth pairs with the API token, from a supplied value and then the environment.
 * The email is not a secret, which is why it resolves apart from the token, and it names the keychain account
 * under which the token is stored.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function resolveJiraEmail(options: JiraEmailOptions = {}): string {
  const { email, env = process.env } = options;

  const resolved = firstFilled(email, env[EMAIL_VARIABLE]);
  if (resolved === undefined) {
    throw new Error(`No Atlassian account email was given. Supply one, or set ${EMAIL_VARIABLE}.`);
  }

  return resolved;
}

export interface JiraEmailOptions {
  /** Takes precedence over the environment, so a caller that read one from its own surface passes it here. */
  readonly email?: string | undefined;
  readonly env?: Record<string, string | undefined> | undefined;
}
