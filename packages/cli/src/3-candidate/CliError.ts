/** Options of a `CliError`: the standard error options, plus the code with which the process exits. */
export interface CliErrorOptions extends ErrorOptions {
  /** An integer from 1 to 255; defaults to 1. */
  exitCode?: number | undefined;
}

/**
 * Reports an anticipated failure. `runCli` writes its message to stderr as `<name>: <message>` and returns its
 * `exitCode`, without the pointer to help that a `UsageError`, the subclass for invalid input, adds.
 * @category CLI
 * @stage candidate
 */
export class CliError extends Error {
  readonly exitCode: number;

  constructor(message: string, options?: CliErrorOptions) {
    const exitCode = options?.exitCode ?? 1;
    if (!Number.isSafeInteger(exitCode) || exitCode < 1 || exitCode > 255) {
      throw new RangeError(`A CliError exit code must be an integer from 1 to 255: ${String(exitCode)}`);
    }
    super(message, options);
    this.name = 'CliError';
    this.exitCode = exitCode;
  }
}
