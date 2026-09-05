import type { WritableSecretStore } from '@williamthorsen/toolbelt.secrets/candidate';

export const EXIT_OK = 0;
export const EXIT_NO_RESULT = 1;
export const EXIT_USAGE = 2;
export const EXIT_KEYSTORE = 3;

const SUBCOMMANDS = new Set(['auth']);

/** Reports a failure to reach the keychain, which is neither a usage error nor an absent secret. */
export class KeystoreError extends Error {}

/** The effects deferred to the entry point, which is what keeps every subcommand free of I/O. */
export interface TbJiraEffects {
  readonly createStore: () => WritableSecretStore;
  readonly env: Record<string, string | undefined>;
  readonly isStdinTty: () => boolean;
  /** Reads a token from the terminal, echoing nothing and asking twice. */
  readonly promptSecret: () => Promise<string>;
  readonly readStdin: () => string;
  readonly resolveVersion: () => string;
  readonly write: (text: string) => void;
  readonly writeError: (text: string) => void;
}

/**
 * Runs a keychain operation, reporting what it threw as a failure to reach the keychain rather than as a usage
 * error.
 *
 * @internal
 */
export function callKeystore<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    throw new KeystoreError(describeError(error));
  }
}

/**
 * Extracts the message carried by an unknown thrown value.
 *
 * @internal
 */
export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Reports a usage or validation failure, pointing at the help of whichever command was invoked.
 *
 * @internal
 */
export function fail(effects: TbJiraEffects, message: string, command: string | undefined): number {
  const scope = command !== undefined && SUBCOMMANDS.has(command) ? `tb-jira ${command}` : 'tb-jira';
  effects.writeError(`${message}\nTry \`${scope} --help\`.\n`);

  return EXIT_USAGE;
}

/**
 * Reports a printed result, terminating the line written by the caller.
 *
 * @internal
 */
export function succeed(effects: TbJiraEffects, output: string): number {
  effects.write(`${output}\n`);

  return EXIT_OK;
}
