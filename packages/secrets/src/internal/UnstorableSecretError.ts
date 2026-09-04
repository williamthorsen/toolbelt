/**
 * Reports a value that cannot reach `security` intact. It is distinct from a failure to reach the keychain,
 * since nothing was attempted: the caller gave a secret, service, or account that no command line can carry.
 *
 * @internal
 */
export class UnstorableSecretError extends Error {}
