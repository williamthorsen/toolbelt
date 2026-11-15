/** Options of a `UsageError`: the standard error options, plus the valid name nearest to the input. */
export interface UsageErrorOptions extends ErrorOptions {
  /** The valid name nearest to the input, which `runCli` offers as `Did you mean '<suggestion>'?`. */
  suggestion?: string | undefined;
}

/**
 * Reports invalid command-line input. `runCli` writes its message to stderr, then its `suggestion` when it has
 * one, then a pointer to help, and returns exit code 2; any other error propagates.
 * @category CLI
 * @stage candidate
 */
export class UsageError extends Error {
  readonly suggestion: string | undefined;

  constructor(message: string, options?: UsageErrorOptions) {
    super(message, options);
    this.name = 'UsageError';
    this.suggestion = options?.suggestion;
  }
}
