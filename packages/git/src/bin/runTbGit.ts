import { parseArgs } from 'node:util';

import { deriveBranchNumber } from '../3-candidate/deriveBranchNumber.ts';
import { findBranchTicketRef } from '../3-candidate/findBranchTicketRef.ts';

const EXIT_OK = 0;
const EXIT_NO_RESULT = 1;
const EXIT_USAGE = 2;

const SUBCOMMANDS = new Set(['branch-number', 'ticket-ref']);

const HELP_OPTION = { help: { type: 'boolean', short: 'h' } } as const;

const ROOT_HELP = `Usage: tb-git <subcommand> [<branch>] [options]

Utilities for working with git branch names.

Subcommands:
  branch-number  Print a stable number derived from a branch name
  ticket-ref     Print the ID of the ticket encoded by a branch name

Options:
  -h, --help     Print this help; each subcommand takes its own --help
      --version  Print the installed version

With no <branch>, the checked-out branch is used.

Exit codes:
  0  A result was printed
  1  ticket-ref found no ticket in the branch name
  2  Usage or validation error`;

const BRANCH_NUMBER_HELP = `Usage: tb-git branch-number [<branch>] [options]

Print the number of the ticket encoded by the branch name, or a hash of the name when it encodes none.

Options:
  -h, --help      Print this help
      --key K     The project's ticket key, matched in any casing
      --max N     Upper bound, inclusive (default 4294967295)
      --min N     Lower bound, inclusive (default 0)
      --offset N  Rotate the result within the bounds; write a negative one as --offset=-3

With no <branch>, the checked-out branch is used.`;

const TICKET_REF_HELP = `Usage: tb-git ticket-ref [<branch>] [options]

Print the ID of the ticket encoded by the branch name, exiting 1 when it encodes none.

Options:
  -h, --help   Print this help
      --json   Print the whole ref on one line as JSON
      --key K  The project's ticket key, matched in any casing

With no <branch>, the checked-out branch is used.`;

/**
 * Runs the `tb-git` command line, returning what to write and exit with rather than doing either, so the
 * whole surface is exercisable without a process. Every failure is reported through the result: nothing throws.
 *
 * @internal
 */
export function runTbGit(args: string[], effects: TbGitEffects): TbGitResult {
  try {
    return dispatch(args, effects);
  } catch (error) {
    return fail(describeError(error), args[0]);
  }
}

/** The effects deferred to the entry point, which is what keeps the runner free of I/O. */
export interface TbGitEffects {
  readonly resolveBranch: () => string;
  readonly resolveVersion: () => string;
}

/** What the caller should write to each stream and exit with. */
export interface TbGitResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}

// region | Helpers

/** Extracts the message carried by an unknown thrown value. */
function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Routes the arguments to a subcommand, or answers the root command's own options. */
function dispatch(args: string[], effects: TbGitEffects): TbGitResult {
  const [command, ...rest] = args;

  if (command === 'branch-number') return runBranchNumber(rest, effects);
  if (command === 'ticket-ref') return runTicketRef(rest, effects);
  if (command === '--help' || command === '-h') return succeed(ROOT_HELP);
  if (command === '--version') return succeed(effects.resolveVersion());
  if (command === undefined) return fail('A subcommand is required.', command);

  return fail(`Unknown ${command.startsWith('-') ? 'option' : 'subcommand'}: ${command}`, command);
}

/** Reports a usage or validation failure, pointing at the help of whichever command was invoked. */
function fail(message: string, command: string | undefined): TbGitResult {
  const scope = command !== undefined && SUBCOMMANDS.has(command) ? `tb-git ${command}` : 'tb-git';

  return { exitCode: EXIT_USAGE, stderr: `${message}\nTry \`${scope} --help\`.\n`, stdout: '' };
}

/** Parses the `branch-number` subcommand and prints the number its options derive. */
function runBranchNumber(args: string[], effects: TbGitEffects): TbGitResult {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: {
      ...HELP_OPTION,
      key: { type: 'string' },
      max: { type: 'string' },
      min: { type: 'string' },
      offset: { type: 'string' },
    },
    strict: true,
  });

  if (values.help) return succeed(BRANCH_NUMBER_HELP);

  const number = deriveBranchNumber(selectBranch(positionals, effects), {
    key: values.key,
    max: toNumber('max', values.max),
    min: toNumber('min', values.min),
    offset: toNumber('offset', values.offset),
  });

  return succeed(String(number));
}

/** Parses the `ticket-ref` subcommand and prints the ref that it finds, or reports that it found none. */
function runTicketRef(args: string[], effects: TbGitEffects): TbGitResult {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    args,
    options: { ...HELP_OPTION, json: { type: 'boolean' }, key: { type: 'string' } },
    strict: true,
  });

  if (values.help) return succeed(TICKET_REF_HELP);

  const ref = findBranchTicketRef(selectBranch(positionals, effects), { key: values.key });
  if (ref === undefined) return { exitCode: EXIT_NO_RESULT, stderr: '', stdout: '' };

  return succeed(values.json === true ? JSON.stringify(ref) : ref.id);
}

/**
 * Chooses the branch to derive from: the sole positional, or the checked-out branch when none is given.
 * An empty positional is rejected rather than treated as absent, so a caller's own failed resolution of
 * the branch name surfaces here instead of being silently replaced.
 */
function selectBranch(positionals: string[], effects: TbGitEffects): string {
  if (positionals.length > 1) {
    throw new Error(`Expected at most one branch name. Received ${positionals.length}.`);
  }

  const [branch] = positionals;
  if (branch === undefined) return effects.resolveBranch();
  if (branch === '') throw new Error('The branch name is empty. Omit it to use the checked-out branch.');

  return branch;
}

/** Reports a printed result, terminating the line written by the caller. */
function succeed(output: string): TbGitResult {
  return { exitCode: EXIT_OK, stderr: '', stdout: `${output}\n` };
}

/**
 * Converts a flag's text to a number, leaving validation of a present value to the library that receives it.
 * A blank value is rejected here instead, since `Number('')` is `0` and an unset shell variable expands to it.
 */
function toNumber(flag: string, value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  if (value.trim() === '') throw new Error(`The value of --${flag} is empty.`);

  return Number(value);
}

// endregion | Helpers
