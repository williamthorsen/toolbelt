import { parseArgs } from 'node:util';

import type { SecretQuery, SecretStore, WritableSecretStore } from '../3-candidate/SecretStore.ts';
import { assertStorableSecret } from '../internal/assertStorableSecret.ts';

const EXIT_OK = 0;
const EXIT_NO_RESULT = 1;
const EXIT_USAGE = 2;
const EXIT_KEYSTORE = 3;

const SUBCOMMANDS = new Set(['delete', 'get', 'has', 'set']);

const ACCOUNT_OPTION = { account: { type: 'string', short: 'a' } } as const;
const HELP_OPTION = { help: { type: 'boolean', short: 'h' } } as const;
const KEYCHAIN_OPTION = { keychain: { type: 'string', short: 'k' } } as const;

const ROOT_HELP = `Usage: tb-secret <subcommand> <service> [options]

Store and read secrets in the macOS keychain. Requires macOS.

Subcommands:
  delete  Remove a secret
  get     Print a secret
  has     Report whether a secret is stored, printing nothing
  set     Store a secret read from stdin

Options:
  -h, --help     Print this help; each subcommand takes its own --help
      --version  Print the installed version

A secret is named by a service and an optional account, so one service can hold a secret per account. An item
is local to this Mac: \`security\` offers no iCloud Keychain synchronization.

Exit codes:
  0  The command succeeded
  1  No secret is stored under that service and account
  2  Usage or validation error
  3  The keychain could not be reached`;

const DELETE_HELP = `Usage: tb-secret delete <service> [options]

Remove a secret, exiting 1 where none is stored.

Options:
  -h, --help             Print this help
  -a, --account <name>   Account holding the secret (default: the empty account)
  -k, --keychain <path>  Keychain to act on, rather than the default search list`;

const GET_HELP = `Usage: tb-secret get <service> [options]

Print a secret, exiting 1 where none is stored.

Options:
  -h, --help             Print this help
  -a, --account <name>   Account holding the secret (default: the empty account)
  -k, --keychain <path>  Keychain to read, rather than the default search list`;

const HAS_HELP = `Usage: tb-secret has <service> [options]

Exit 0 where a secret is stored and 1 where none is, printing nothing either way. The secret itself is never
read, so this raises no keychain access prompt.

Options:
  -h, --help             Print this help
  -a, --account <name>   Account holding the secret (default: the empty account)
  -k, --keychain <path>  Keychain to read, rather than the default search list`;

const SET_HELP = `Usage: tb-secret set <service> [options]

Store a secret, replacing one already held under the same service and account.

The secret is read from stdin. At a terminal, \`security\` prompts for it instead, so it is neither echoed nor
held by this program. A secret carrying a line break cannot be stored, since the prompt reads one line.

A write lands in the default keychain, the only one \`security\` accepts a secret for without taking it on a
command line, so this subcommand has no --keychain.

Options:
  -h, --help            Print this help
  -a, --account <name>  Account to hold the secret (default: the empty account)`;

/**
 * Runs the `tb-secret` command line, returning what to write and exit with rather than doing either, so the
 * whole surface is exercisable without a process. Every failure is reported through the result: nothing throws.
 *
 * @internal
 */
export function runTbSecret(args: string[], effects: TbSecretEffects): TbSecretResult {
  try {
    return dispatch(args, effects);
  } catch (error) {
    if (error instanceof KeystoreError) return { exitCode: EXIT_KEYSTORE, stderr: `${error.message}\n`, stdout: '' };

    return fail(describeError(error), args[0]);
  }
}

/** The effects deferred to the entry point, which is what keeps the runner free of I/O. */
export interface TbSecretEffects {
  readonly createStore: (keychain: string | undefined) => SecretStore;
  readonly createWritableStore: () => WritableSecretStore;
  readonly isStdinTty: () => boolean;
  /** Hands the terminal to `security`, which prompts for the secret itself, and reports its exit code. */
  readonly promptSecret: (query: SecretQuery) => number;
  readonly readStdin: () => string;
  readonly resolveVersion: () => string;
}

/** What the caller should write to each stream and exit with. */
export interface TbSecretResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

// region | Helpers

/** Reports a failure to reach the keychain, which is neither a usage error nor an absent secret. */
class KeystoreError extends Error {}

/** Names the item a subcommand acts on. */
function buildQuery(positionals: string[], account: string | undefined): SecretQuery {
  return { account, service: selectService(positionals) };
}

/** Runs a keychain operation, reporting what it threw as a failure to reach the keychain. */
function callKeystore<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    throw new KeystoreError(describeError(error));
  }
}

/** Extracts the message carried by an unknown thrown value. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Routes the arguments to a subcommand, or answers the root command's own options. */
function dispatch(args: string[], effects: TbSecretEffects): TbSecretResult {
  const [command, ...rest] = args;

  if (command === 'delete') return runDelete(rest, effects);
  if (command === 'get') return runGet(rest, effects);
  if (command === 'has') return runHas(rest, effects);
  if (command === 'set') return runSet(rest, effects);
  if (command === '--help' || command === '-h') return succeed(ROOT_HELP);
  if (command === '--version') return succeed(effects.resolveVersion());
  if (command === undefined) return fail('A subcommand is required.', command);

  return fail(`Unknown ${command.startsWith('-') ? 'option' : 'subcommand'}: ${command}`, command);
}

/** Reports a usage or validation failure, pointing at the help of whichever command was invoked. */
function fail(message: string, command: string | undefined): TbSecretResult {
  const scope = command !== undefined && SUBCOMMANDS.has(command) ? `tb-secret ${command}` : 'tb-secret';

  return { exitCode: EXIT_USAGE, stderr: `${message}\nTry \`${scope} --help\`.\n`, stdout: '' };
}

/** Parses the `delete` subcommand and removes the secret it names. */
function runDelete(args: string[], effects: TbSecretEffects): TbSecretResult {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { ...ACCOUNT_OPTION, ...HELP_OPTION, ...KEYCHAIN_OPTION },
    strict: true,
  });

  if (values.help === true) return succeed(DELETE_HELP);

  const query = buildQuery(positionals, values.account);
  const removed = callKeystore(() => effects.createStore(values.keychain).deleteSecret(query));

  return removed ? succeedSilently() : reportNoResult();
}

/** Parses the `get` subcommand and prints the secret it names. */
function runGet(args: string[], effects: TbSecretEffects): TbSecretResult {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { ...ACCOUNT_OPTION, ...HELP_OPTION, ...KEYCHAIN_OPTION },
    strict: true,
  });

  if (values.help === true) return succeed(GET_HELP);

  const query = buildQuery(positionals, values.account);
  const secret = callKeystore(() => effects.createStore(values.keychain).findSecret(query));

  return secret === undefined ? reportNoResult() : succeed(secret);
}

/** Parses the `has` subcommand and reports presence through the exit code alone. */
function runHas(args: string[], effects: TbSecretEffects): TbSecretResult {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { ...ACCOUNT_OPTION, ...HELP_OPTION, ...KEYCHAIN_OPTION },
    strict: true,
  });

  if (values.help === true) return succeed(HAS_HELP);

  const query = buildQuery(positionals, values.account);
  const stored = callKeystore(() => effects.createStore(values.keychain).hasSecret(query));

  return stored ? succeedSilently() : reportNoResult();
}

/**
 * Parses the `set` subcommand and stores the secret it is given. A terminal is handed to `security`, which
 * prompts for the secret with no echo and asks for it twice, so an interactively typed secret never reaches
 * this process; a piped secret arrives on stdin, and one trailing newline is dropped, since `echo` adds one.
 */
function runSet(args: string[], effects: TbSecretEffects): TbSecretResult {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { ...ACCOUNT_OPTION, ...HELP_OPTION, ...KEYCHAIN_OPTION },
    strict: true,
  });

  if (values.help === true) return succeed(SET_HELP);
  if (values.keychain !== undefined) {
    throw new Error('A secret can be stored only in the default keychain, so `set` takes no --keychain.');
  }

  const query = buildQuery(positionals, values.account);

  if (effects.isStdinTty()) {
    const exitCode = callKeystore(() => effects.promptSecret(query));
    if (exitCode !== EXIT_OK) throw new KeystoreError(`\`security\` exited ${exitCode} without storing the secret.`);

    return succeedSilently();
  }

  const secret = stripOneTrailingNewline(effects.readStdin());
  assertStorableSecret(secret);
  callKeystore(() => effects.createWritableStore().setSecret(query, secret));

  return succeedSilently();
}

/** Reports that no secret is stored under the named service and account. */
function reportNoResult(): TbSecretResult {
  return { exitCode: EXIT_NO_RESULT, stderr: '', stdout: '' };
}

/** Chooses the service to act on, which is the sole positional. */
function selectService(positionals: string[]): string {
  if (positionals.length > 1) throw new Error(`Expected one service name. Received ${positionals.length}.`);

  const [service] = positionals;
  if (service === undefined) throw new Error('A service name is required.');
  if (service === '') throw new Error('The service name is empty.');

  return service;
}

/** Reports a printed result, terminating the line written by the caller. */
function succeed(output: string): TbSecretResult {
  return { exitCode: EXIT_OK, stderr: '', stdout: `${output}\n` };
}

/** Reports a result that prints nothing, which is how a secret stays off a terminal and out of a log. */
function succeedSilently(): TbSecretResult {
  return { exitCode: EXIT_OK, stderr: '', stdout: '' };
}

/** Drops the newline a shell adds to a piped secret, leaving one written without a terminator untouched. */
function stripOneTrailingNewline(input: string): string {
  return input.replace(/\r?\n$/, '');
}

// endregion | Helpers
