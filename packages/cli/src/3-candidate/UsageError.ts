import { CliError } from './CliError.ts';

/** Options of a `UsageError`: the standard error options, plus the valid name nearest to the input. */
export interface UsageErrorOptions extends ErrorOptions {
  /** The valid name nearest to the input, which `runCli` offers as `Did you mean '<suggestion>'?`. */
  suggestion?: string | undefined;
}

/**
 * Reports invalid command-line input: a `CliError` with exit code 2. `runCli` writes its message to stderr, then
 * its `suggestion` when it has one, then a pointer to help, and returns 2.
 * @category CLI
 * @stage candidate
 */
export class UsageError extends CliError {
  readonly suggestion: string | undefined;

  constructor(message: string, options?: UsageErrorOptions) {
    super(message, { ...options, exitCode: 2 });
    this.name = 'UsageError';
    this.suggestion = options?.suggestion;
  }
}
