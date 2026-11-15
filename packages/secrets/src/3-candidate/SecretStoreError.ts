/**
 * A secret store that could not be reached or did not answer usably: a platform without the store, a `security`
 * command that cannot run, is killed, or exits non-zero, a write that cannot be verified or did not survive intact,
 * or output that cannot be parsed. An absent secret is not a failure and does not throw it.
 *
 * @category Secrets
 * @experimental
 * @stage candidate
 */
export class SecretStoreError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'SecretStoreError';
  }
}
