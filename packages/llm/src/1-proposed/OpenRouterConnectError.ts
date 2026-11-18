/**
 * The error that `completeOpenRouterConnect` rejects with when the connection does not complete: The user did not
 * approve it, the callback's `state` does not match the flow that this tab started, or OpenRouter refused the key
 * exchange. `status` is the exchange's HTTP status, absent when OpenRouter was not called or did not answer, and the
 * message is OpenRouter's own when its response states one.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export class OpenRouterConnectError extends Error {
  override readonly name = 'OpenRouterConnectError';
  readonly status: number | undefined;

  constructor(message: string, options: { readonly status?: number; readonly cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.status = options.status;
  }
}
