import process from 'node:process';

import type { BoundCommand, BoundGroup, CommandNode, RunResult, Writer } from './nodes.ts';
import { renderHelp } from './renderHelp.ts';
import { resolveLongName } from './resolveLongName.ts';
import { findFlagEntry, tokenizeArgs } from './tokenizeArgs.ts';
import type { FlagSchema } from './types.ts';
import { UsageError } from './UsageError.ts';

/** The exit code that `runCli` returns on a usage error. */
const USAGE_EXIT_CODE = 2;

const HELP_FLAG = { long: 'help', short: 'h' };
const VERSION_FLAG = { long: 'version', short: 'V' };

/** Options of `runCli`. */
export interface RunCliOptions<C> {
  /** The invocation name, which begins every usage line and every scope. */
  name: string;
  /** The context that the root receives. */
  context: C;
  stdout: Writer;
  stderr: Writer;
  /** The directory against which path flags resolve; defaults to the working directory. */
  baseDir?: string;
  /** Returns the version that `-V`/`--version` prints at the root; without it, the root does not reserve them. */
  version?: () => string;
}

/**
 * Runs a command tree against arguments and resolves to the exit code.
 *
 * At each group, it reads the group's flags before the command token, derives the commands' context, and
 * descends into the named command, or into the default command when the level has no command token. It
 * intercepts `-h`/`--help` at every level before parsing, so that help wins over a parse error at the same
 * level, except after a passthrough command's token; it intercepts `-V`/`--version` at the root alone.
 *
 * A `UsageError`, whether from parsing, from an unknown or missing command, or thrown by a `deriveContext` or a
 * `run`, is written to `stderr` with the scope reached so far and returns 2. Any other error propagates, as does
 * a `run` result other than nothing or an integer from 0 to 255. It writes only to the writers that it is
 * given and never calls `process.exit`.
 * @category CLI
 * @stage candidate
 */
export function runCli(
  argv: readonly string[],
  root: CommandNode<undefined>,
  options: Omit<RunCliOptions<undefined>, 'context'>,
): Promise<number>;
export function runCli<C>(argv: readonly string[], root: CommandNode<C>, options: RunCliOptions<C>): Promise<number>;
export async function runCli<C>(
  argv: readonly string[],
  root: CommandNode<C | undefined>,
  options: Omit<RunCliOptions<C>, 'context'> & { context?: C },
): Promise<number> {
  const { name, stdout, stderr, version } = options;
  if (version !== undefined) assertVersionUnreserved(root.flags);

  const walk: Walk = {
    baseDir: options.baseDir ?? process.cwd(),
    hasVersion: version !== undefined,
    scope: [name],
  };

  try {
    const outcome = await walkTree(argv, root.bind(options.context), walk);
    if (outcome === 'help' || outcome === 'version') return 0;
    return outcome;
  } catch (error: unknown) {
    if (!(error instanceof UsageError)) throw error;
    stderr.write(`Error: ${error.message}\n`);
    stderr.write(`Try '${walk.scope.join(' ')} --help'.\n`);
    return USAGE_EXIT_CODE;
  }

  /** Walks from the root to a command, writing help or the version when either is requested in scope. */
  async function walkTree(
    args: readonly string[],
    bound: BoundCommand | BoundGroup,
    state: Walk,
  ): Promise<number | Requested> {
    let current = bound;
    let remaining = args;
    let isRoot = true;

    while ('enter' in current) {
      const { node } = current;
      const requested = scanGroupScope(
        remaining,
        node.flags,
        node.defaultCommand !== undefined,
        isRoot && state.hasVersion,
      );
      if (requested !== undefined) return writeRequested(requested, node, isRoot, state);

      const entry = current.enter(remaining, state.baseDir);
      const [token] = entry.rest;
      if (token !== undefined && isCommandToken(token)) {
        const child = entry.bindCommand(token);
        if (child === undefined) throw new UsageError(`Unknown command: ${token}`);
        current = child;
        remaining = entry.rest.slice(1);
        state.scope.push(token);
      } else if (node.defaultCommand === undefined) {
        throw new UsageError('A command is required.');
      } else {
        const child = entry.bindCommand(node.defaultCommand);
        if (child === undefined) throw new Error(`Default command '${node.defaultCommand}' is not bound.`);
        current = child;
        remaining = entry.rest;
        state.scope.push(node.defaultCommand);
      }
      isRoot = false;
    }

    const { node } = current;
    if (!node.passthrough) {
      const requested = scanCommandScope(remaining, node.flags, isRoot && state.hasVersion);
      if (requested !== undefined) return writeRequested(requested, node, isRoot, state);
    }

    const result = await current.invoke({ args: remaining, stdout, stderr, baseDir: state.baseDir });
    return validateExitCode(result);
  }

  /** Writes the help page or the version and returns which it wrote. */
  function writeRequested(requested: Requested, node: CommandNode<never>, isRoot: boolean, state: Walk): Requested {
    if (requested === 'help') {
      stdout.write(`${renderHelp(node, state.scope.join(' '), { version: isRoot && state.hasVersion })}\n`);
    } else if (version !== undefined) {
      stdout.write(`${version()}\n`);
    }
    return requested;
  }
}

// region | Helpers

type Requested = 'help' | 'version';

/** The state of one walk: where paths resolve, whether the root is versioned, and the scope reached so far. */
interface Walk {
  baseDir: string;
  hasVersion: boolean;
  scope: string[];
}

/** Throws a plain `Error` when a versioned root declares `--version` or `-V` itself. */
function assertVersionUnreserved(flags: FlagSchema): void {
  for (const [key, definition] of Object.entries(flags)) {
    if (resolveLongName(key, definition) === VERSION_FLAG.long || definition.short === VERSION_FLAG.short) {
      throw new Error(`Flag '${key}' collides with -V, --version, which the root reserves when given a version.`);
    }
  }
}

/** Reports whether a token names a command: a positional other than the `--` terminator. */
function isCommandToken(token: string): boolean {
  return token === '-' || !token.startsWith('-');
}

/** Finds a help or version request among the arguments before `--`. */
function scanCommandScope(args: readonly string[], flags: FlagSchema, withVersion: boolean): Requested | undefined {
  return scanScope(args, flags, withVersion, (token) => token.kind === 'option-terminator');
}

/**
 * Finds a help or version request among the arguments before the command token, or, for a group with a
 * default command, before the first flag that the group does not claim.
 */
function scanGroupScope(
  args: readonly string[],
  flags: FlagSchema,
  hasDefaultCommand: boolean,
  withVersion: boolean,
): Requested | undefined {
  return scanScope(args, flags, withVersion, (token, isClaimed) => {
    if (token.kind !== 'option') return true;
    return hasDefaultCommand && !isClaimed;
  });
}

/**
 * Finds a help or version request in scope, help first. It reads both the lenient tokenization, which finds a
 * clustered `-qh`, and the literal arguments, which find a `--help` consumed as another flag's value.
 */
function scanScope(
  args: readonly string[],
  flags: FlagSchema,
  withVersion: boolean,
  endsScope: (token: { kind: string }, isClaimed: boolean) => boolean,
): Requested | undefined {
  const reserved = withVersion ? [HELP_FLAG, VERSION_FLAG] : [HELP_FLAG];
  const { tokens, flagsByName } = tokenizeArgs(args, flags, reserved);

  const names = new Set<string>();
  let end = args.length;
  for (const token of tokens) {
    const isReserved = token.kind === 'option' && reserved.some((flag) => flag.long === token.name);
    const isClaimed = token.kind === 'option' && (isReserved || findFlagEntry(flagsByName, token) !== undefined);
    if (endsScope(token, isClaimed)) {
      end = token.index;
      break;
    }
    if (isReserved) names.add(token.name);
  }

  for (const arg of args.slice(0, end)) {
    for (const flag of reserved) {
      if (arg === `--${flag.long}` || arg === `-${flag.short}`) names.add(flag.long);
    }
  }

  if (names.has(HELP_FLAG.long)) return 'help';
  if (names.has(VERSION_FLAG.long)) return 'version';
  return undefined;
}

/** Maps nothing to 0, and throws a plain `Error` on anything other than an integer from 0 to 255. */
function validateExitCode(result: Awaited<RunResult>): number {
  if (result === undefined) return 0;
  if (Number.isSafeInteger(result) && result >= 0 && result <= 255) return result;
  throw new Error(`A command returned an invalid exit code: ${String(result)}`);
}

// endregion | Helpers
