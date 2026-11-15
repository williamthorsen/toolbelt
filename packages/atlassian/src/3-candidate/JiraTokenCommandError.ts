/**
 * A configured token command that cannot run, is killed before it exits, or exits non-zero. The command is the
 * configured alternative to the keychain, so a caller may report it as it reports a keychain failure.
 *
 * @category Jira
 * @experimental
 * @stage candidate
 */
export class JiraTokenCommandError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'JiraTokenCommandError';
  }
}
