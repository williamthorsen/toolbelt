/** Names one stored secret. An omitted account is the empty account, which is matched exactly. */
export interface SecretQuery {
  readonly account?: string;
  readonly service: string;
}

/**
 * A secret store that can be read from and removed from. A backend may support no more than this: the macOS
 * keychain accepts a new secret only into its default keychain, so a store opened on a named keychain is one
 * of these and no more.
 */
export interface SecretStore {
  /** Removes a secret, reporting whether one was there to remove. */
  deleteSecret(query: SecretQuery): boolean;

  /** Reads a secret, answering `undefined` where none is stored. */
  findSecret(query: SecretQuery): string | undefined;

  /** Reports whether a secret is stored, without reading it. */
  hasSecret(query: SecretQuery): boolean;
}

/** A secret store that also accepts a new secret. */
export interface WritableSecretStore extends SecretStore {
  /** Stores a secret, replacing one already held under the same service and account. */
  setSecret(query: SecretQuery, secret: string): void;
}
