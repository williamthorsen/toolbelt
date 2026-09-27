/**
 * The error for a value that cannot be passed to `security` intact. It is distinct from a failure to reach the
 * keychain, since nothing was attempted: The caller gave a secret, service, or account that the command line cannot
 * contain.
 *
 * @category Secrets
 * @experimental
 * @stage candidate
 */
export class UnstorableSecretError extends Error {}
