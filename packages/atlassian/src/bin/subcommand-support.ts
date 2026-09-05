import type { SecretStore, WritableSecretStore } from '@williamthorsen/toolbelt.secrets/candidate';

import type { JiraRequest, TokenTransportOptions } from '../3-candidate/createTokenTransport.ts';

export const EXIT_OK = 0;
export const EXIT_NO_RESULT = 1;
export const EXIT_USAGE = 2;
export const EXIT_KEYSTORE = 3;
export const EXIT_REQUEST = 4;
export const EXIT_MISMATCH = 5;

const SUBCOMMANDS = new Set(['auth', 'configure-project']);

/** Reports a failure to reach the keychain, which is neither a usage error nor an absent secret. */
export class KeystoreError extends Error {}

/** The effects deferred to the entry point, which is what keeps every subcommand free of I/O. */
export interface TbJiraEffects {
  /** Builds the transport that every Jira call is issued through. */
  readonly createRequest: (options: TokenTransportOptions) => JiraRequest;
  readonly createStore: () => WritableSecretStore;
  readonly cwd: () => string;
  readonly env: Record<string, string | undefined>;
  readonly fetch: typeof globalThis.fetch;
  /** Finds the consuming repo's project spec by ascending from a directory. */
  readonly findSpecPath: (fromDir: string) => string;
  readonly isStdinTty: () => boolean;
  /** Reads a token from the terminal, echoing nothing and asking twice. */
  readonly promptSecret: () => Promise<string>;
  readonly readStdin: () => string;
  readonly readTextFile: (filePath: string) => string;
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
 * Wraps the keychain so that it is opened on first use rather than on construction. A run authenticated from
 * the environment then reaches no keychain at all, and a platform holding none is reported only where a caller
 * actually reads from it.
 *
 * @internal
 */
export function createDeferredStore(effects: TbJiraEffects): SecretStore {
  let opened: WritableSecretStore | undefined;

  function open(): WritableSecretStore {
    return (opened ??= callKeystore(() => effects.createStore()));
  }

  return {
    deleteSecret: (query) => open().deleteSecret(query),
    findSecret: (query) => open().findSecret(query),
    hasSecret: (query) => open().hasSecret(query),
  };
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
 * Drops the newline a shell adds to a piped value, leaving one written without a terminator untouched.
 *
 * @internal
 */
export function stripOneTrailingNewline(input: string): string {
  return input.replace(/\r?\n$/, '');
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
