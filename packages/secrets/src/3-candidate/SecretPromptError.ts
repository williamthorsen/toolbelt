/**
 * A prompt that produced no secret: The two entries differed, or the input ended before a secret was entered.
 * Nothing was stored when it is thrown.
 *
 * @category Secrets
 * @experimental
 * @stage candidate
 */
export class SecretPromptError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);

    this.name = 'SecretPromptError';
  }
}
