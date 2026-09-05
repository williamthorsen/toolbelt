import { firstFilled } from '../internal/firstFilled.ts';

const EMAIL_VARIABLE = 'JIRA_EMAIL';

/**
 * Resolves the email that Basic auth pairs with the API token, from a supplied value, then the environment,
 * then the fallback. The email is not a secret, which is why it resolves apart from the token, and it names the
 * keychain account under which the token is stored.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export function resolveJiraEmail(options: JiraEmailOptions = {}): string {
  const { email, env = process.env, fallback } = options;

  const resolved = firstFilled(email, env[EMAIL_VARIABLE], fallback);
  if (resolved === undefined) {
    throw new Error(
      `No Atlassian account email was given. Supply one, set ${EMAIL_VARIABLE}, or declare one in the spec.`,
    );
  }

  return resolved;
}

export interface JiraEmailOptions {
  /** Takes precedence over every other source, so a caller that read one from its own surface passes it here. */
  readonly email?: string | undefined;
  readonly env?: Record<string, string | undefined> | undefined;
  /** The last source, read only where the two above miss. A project spec's `email` reaches the chain here. */
  readonly fallback?: string | undefined;
}
