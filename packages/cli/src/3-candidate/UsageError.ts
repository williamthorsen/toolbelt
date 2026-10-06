/**
 * Reports invalid command-line input. `runCli` writes its message to stderr with a pointer to help and
 * returns exit code 2; any other error propagates.
 * @category CLI
 * @stage candidate
 */
export class UsageError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'UsageError';
  }
}
