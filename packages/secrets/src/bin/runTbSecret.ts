import { parseArgs } from 'node:util';

import type { SecretQuery, WritableSecretStore } from '../3-candidate/SecretStore.ts';
import { UnstorableSecretError } from '../internal/UnstorableSecretError.ts';

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
  set     Store a secret

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

At a terminal the secret is prompted for twice and echoed nowhere; piped, it is read from stdin and one
trailing newline is dropped, since \`echo\` adds one. Either way it reaches \`security\` inside a command that
travels on stdin, so it never enters an argument vector that any local process could read.

The stored secret is read back and compared before this command reports success. Replacing an item that
another program created can therefore raise a keychain access prompt, since verifying the write reads the
secret.

A secret can be about 2,000 bytes long. The exact ceiling depends on the service, account, and keychain, which
share one 4,095-byte command line with it; a secret that would not fit is refused rather than stored in part.

Options:
  -h, --help             Print this help
  -a, --account <name>   Account to hold the secret (default: the empty account)
  -k, --keychain <path>  Keychain to write to, rather than the default search list`;

/**
 * Runs the `tb-secret` command line, returning what to write and exit with rather than doing either, so the
 * whole surface is exercisable without a process. Every failure is reported through the result: nothing throws.
 *
 * @internal
 */
export async function runTbSecret(args: string[], effects: TbSecretEffects): Promise<TbSecretResult> {
  try {
    return await dispatch(args, effects);
  } catch (error) {
    if (error instanceof KeystoreError) return { exitCode: EXIT_KEYSTORE, stderr: `${error.message}\n`, stdout: '' };

    return fail(describeError(error), args[0]);
  }
}

/** The effects deferred to the entry point, which is what keeps the runner free of I/O. */
export interface TbSecretEffects {
  readonly createStore: (keychain: string | undefined) => WritableSecretStore;
  readonly isStdinTty: () => boolean;
  /** Reads a secret from the terminal, echoing nothing and asking twice. */
  readonly promptSecret: () => Promise<string>;
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

/** Names the item on which a subcommand acts. */
function buildQuery(positionals: string[], account: string | undefined): SecretQuery {
  return { account, service: selectService(positionals) };
}

/**
 * Runs a keychain operation, reporting what it threw as a failure to reach the keychain. A value that the
 * keychain cannot carry passes through unwrapped, since nothing was reached: it is a usage error like any other.
 */
function callKeystore<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof UnstorableSecretError) throw error;

    throw new KeystoreError(describeError(error));
  }
}

/** Extracts the message carried by an unknown thrown value. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Routes the arguments to a subcommand, or answers the root command's own options. */
async function dispatch(args: string[], effects: TbSecretEffects): Promise<TbSecretResult> {
  const [command, ...rest] = args;

  if (command === 'delete') return runDelete(rest, effects);
  if (command === 'get') return runGet(rest, effects);
  if (command === 'has') return runHas(rest, effects);
  if (command === 'set') return await runSet(rest, effects);
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

/** Parses the `delete` subcommand and removes the secret that it names. */
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

/** Parses the `get` subcommand and prints the secret that it names. */
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
 * Parses the `set` subcommand and stores the secret that it is given. A terminal is prompted twice with no
 * echo; a piped secret arrives on stdin, and one trailing newline is dropped, since `echo` adds one. The store is
 * opened first, so a platform that has no keychain is reported before a secret is typed into this process.
 */
async function runSet(args: string[], effects: TbSecretEffects): Promise<TbSecretResult> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { ...ACCOUNT_OPTION, ...HELP_OPTION, ...KEYCHAIN_OPTION },
    strict: true,
  });

  if (values.help === true) return succeed(SET_HELP);

  const query = buildQuery(positionals, values.account);
  const store = callKeystore(() => effects.createStore(values.keychain));
  const secret = effects.isStdinTty() ? await effects.promptSecret() : stripOneTrailingNewline(effects.readStdin());

  callKeystore(() => store.setSecret(query, secret));

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

/** Drops the newline that a shell adds to a piped secret, leaving one written without a terminator untouched. */
function stripOneTrailingNewline(input: string): string {
  return input.replace(/\r?\n$/, '');
}

// endregion | Helpers
